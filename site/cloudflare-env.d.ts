declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SENTINELA_OWNER_EMAIL?: string;
    SENTINELA_SERVICE_TOKEN?: string;
    SENTINELA_PUBLIC_READ?: string;
  }
}
