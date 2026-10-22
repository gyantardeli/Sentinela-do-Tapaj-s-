/** Cloudflare Access JWT gate for external hosting. Fail closed, never trust client identity headers. */
const encoder = new TextEncoder();
const DOMAIN_RE = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/;
const MAX_JWT_CHARS = 12000;

export function accessSettings(env) {
  const teamDomain = String(env?.ACCESS_TEAM_DOMAIN ?? '').trim().replace(/\/$/, '').toLowerCase();
  const audience = String(env?.ACCESS_AUD ?? '').trim();
  if (!DOMAIN_RE.test(teamDomain) || !/^[a-zA-Z0-9_-]{16,128}$/.test(audience)) return null;
  return { teamDomain, audience };
}

function base64urlDecode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Base64url inválido');
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
}
function jsonPart(part) { return JSON.parse(new TextDecoder().decode(base64urlDecode(part))); }

/** fetchFn injected only for offline tests. No static JWK hardcoding; identity must be cryptographically proven. */
export async function verifyAccessJwt(rawToken, env, fetchFn = fetch, now = Date.now()) {
  const settings = accessSettings(env);
  if (!settings || typeof rawToken !== 'string' || rawToken.length > MAX_JWT_CHARS) return null;
  const parts = rawToken.split('.');
  if (parts.length !== 3 || parts.some(part => !part)) return null;
  try {
    const [header, payload] = [jsonPart(parts[0]), jsonPart(parts[1])];
    if (!header || header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 256) return null;
    if (!payload || payload.iss !== settings.teamDomain ||
      !(typeof payload.aud === 'string' ? payload.aud === settings.audience : Array.isArray(payload.aud) && payload.aud.includes(settings.audience)) ||
      typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(now / 1000) ||
      typeof payload.iat !== 'number' || !Number.isFinite(payload.iat) || payload.iat > Math.ceil(now / 1000) + 60 ||
      (typeof payload.nbf === 'number' && payload.nbf > Math.floor(now / 1000) + 60) ||
      typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 256 ||
      typeof payload.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || payload.email.length > 320) return null;
    const res = await fetchFn(`${settings.teamDomain}/cdn-cgi/access/certs`, {
      headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const keySet = await res.json();
    const jwk = keySet?.keys?.find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256') && key.use !== 'enc');
    if (!jwk) return null;
    const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const signature = base64urlDecode(parts[2]);
    const valid = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, publicKey, signature, encoder.encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;
    return { id: payload.sub, email: payload.email, name: typeof payload.name === 'string' ? payload.name.slice(0, 240) : null };
  } catch { return null; }
}

export function withVerifiedIdentity(request, user) {
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.toLowerCase().startsWith('oai-authenticated-') || name.toLowerCase() === 'oai-sites-authorization') headers.delete(name);
  }
  headers.delete('cf-access-jwt-assertion');
  headers.set('oai-authenticated-user-id', `cloudflare:${user.id}`);
  headers.set('oai-authenticated-user-email', user.email);
  if (user.name) {
    headers.set('oai-authenticated-user-full-name', encodeURIComponent(user.name));
    headers.set('oai-authenticated-user-full-name-encoding', 'percent-encoded-utf-8');
  }
  return new Request(request, { headers });
}

export function accessDenied(reason = 'Login obrigatório') {
  return new Response(JSON.stringify({ error: reason }), {
    status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}