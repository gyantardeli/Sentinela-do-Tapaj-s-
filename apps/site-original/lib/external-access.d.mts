export type AccessEnv = { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string };
export type VerifiedIdentity = { id: string; email: string; name: string | null };
export function accessSettings(env: AccessEnv): { teamDomain: string; audience: string } | null;
export function verifyAccessJwt(rawToken: string | null, env: AccessEnv, fetchFn?: typeof fetch, now?: number): Promise<VerifiedIdentity | null>;
export function withVerifiedIdentity(request: Request, user: VerifiedIdentity): Request;
export function accessDenied(reason?: string): Response;
