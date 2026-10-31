/**
 * Independent Cloudflare Access auth bridge for the public Sentinela Worker.
 * Does not trust client-supplied oai-authenticated-user-* or Access headers.
 * Only a verified, signed Access *application* cookie may grant write identity.
 */
interface AdminEnv {
  SENTINELA_OWNER_EMAIL?: string;
  SENTINELA_ACCESS_AUD?: string;
  SENTINELA_ACCESS_TEAM_DOMAIN?: string;
}

type AccessClaims = {
  iss?: string;
  aud?: string | string[];
  email?: string;
  sub?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
};
type AccessJwk = JsonWebKey & { kid?: string; alg?: string; kty?: string; use?: string };

let storedKeys: { keys: AccessJwk[]; expiresAt: number } | undefined;
function decodeBytes(input: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) throw new Error("Invalid base64url");
  const raw = input.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(raw.padEnd(Math.ceil(raw.length / 4) * 4, "="));
  return Uint8Array.from(bin, ch => ch.charCodeAt(0));
}
function decodeJson<T>(input: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBytes(input))) as T;
}
async function getKeys(teamDomain: string): Promise<AccessJwk[]> {
  if (storedKeys && storedKeys.expiresAt > Date.now()) return storedKeys.keys;
  const url = new URL("/cdn-cgi/access/certs", teamDomain);
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(7000) });
  if (!res.ok) throw new Error("Access keys not available");
  const body = await res.json() as { keys?: AccessJwk[] };
  if (!Array.isArray(body.keys) || !body.keys.length) throw new Error("No signing keys");
  storedKeys = { keys: body.keys, expiresAt: Date.now() + 5 * 60_000 };
  return body.keys;
}
function cookieValue(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = /(?:^|;\s*)CF_Authorization=([^;]+)/i.exec(cookie);
  return match?.[1] ?? null;
}
export async function verifiedAdminIdentity(
  request: Request,
  env: AdminEnv,
): Promise<{ email: string; userId: string } | null> {
  const token = cookieValue(request);
  const owner = env.SENTINELA_OWNER_EMAIL?.trim().toLowerCase();
  const audience = env.SENTINELA_ACCESS_AUD;
  const domain = env.SENTINELA_ACCESS_TEAM_DOMAIN?.replace(/\/$/, "");
  if (!token || !owner || !audience || !domain || token.length > 12000) return null;

  try {
    const [head, body, sig, extra] = token.split(".");
    if (!head || !body || !sig || extra !== undefined) return null;
    const header = decodeJson<{ alg?: string; kid?: string; typ?: string }>(head);
    if (header.alg !== "RS256" || !header.kid) return null;
    const claims = decodeJson<AccessClaims>(body);
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== domain || !claims.email || claims.email.trim().toLowerCase() !== owner ||
        !claims.sub || !Array.isArray(claims.aud) && claims.aud !== audience ||
        (Array.isArray(claims.aud) && !claims.aud.includes(audience)) ||
        typeof claims.exp !== "number" || claims.exp <= now ||
        (typeof claims.nbf === "number" && claims.nbf > now + 30) ||
        (typeof claims.iat === "number" && claims.iat > now + 30)) return null;

    const jwks = await getKeys(domain);
    const jwk = jwks.find(k => k.kid === header.kid && k.kty === "RSA" &&
      (!k.alg || k.alg === "RS256") && (!k.use || k.use === "sig"));
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
    );
    const signed = new TextEncoder().encode(head + "." + body);
    const signature = decodeBytes(sig);
    if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signed)) return null;
    return { email: owner, userId: claims.sub };
  } catch {
    // Invalid, expired, or unverifiable token is always denied.
    return null;
  }
}
