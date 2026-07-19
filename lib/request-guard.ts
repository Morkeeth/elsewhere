const WINDOW_SECONDS = 15 * 60;
const MAX_WITNESS_REQUESTS = 3;
const GLOBAL_WINDOW_SECONDS = 24 * 60 * 60;

type Bucket = { count: number; resetAt: number };
const localBuckets = new Map<string, Bucket>();
let localGlobal = { count: 0, resetAt: 0 };

export type GuardResult =
  | { allowed: true; retryAfterSeconds: 0 }
  | { allowed: false; retryAfterSeconds: number; reason: "visitor-limit" | "demo-budget" | "configuration" };

export function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
}

export function isSameOriginPost(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  return origin === new URL(request.url).origin;
}

function config() {
  // Vercel's managed KV exposes Upstash-compatible REST credentials under the
  // KV_* names; support both those and direct Upstash configuration.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  const budget = Number(process.env.ELSEWHERE_DEMO_BUDGET);
  return { url, token, budget: Number.isFinite(budget) && budget > 0 ? budget : 0 };
}

async function incrementRemote(url: string, token: string, key: string, ttlSeconds: number) {
  const increment = await fetch(`${url}/incr/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!increment.ok) throw new Error("rate-limit increment failed");
  const body = await increment.json() as { result?: number };
  const count = Number(body.result);
  if (count === 1) await fetch(`${url}/expire/${encodeURIComponent(key)}/${ttlSeconds}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  return count;
}

function takeLocalRequest(key: string, budget: number): GuardResult {
  const now = Date.now();
  const existing = localBuckets.get(key);
  if (!existing || existing.resetAt <= now) localBuckets.set(key, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
  else existing.count += 1;
  const visitor = localBuckets.get(key)!;
  if (visitor.count > MAX_WITNESS_REQUESTS) return { allowed: false, retryAfterSeconds: Math.ceil((visitor.resetAt - now) / 1000), reason: "visitor-limit" };
  if (localGlobal.resetAt <= now) localGlobal = { count: 1, resetAt: now + GLOBAL_WINDOW_SECONDS * 1000 };
  else localGlobal.count += 1;
  if (budget > 0 && localGlobal.count > budget) return { allowed: false, retryAfterSeconds: Math.ceil((localGlobal.resetAt - now) / 1000), reason: "demo-budget" };
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Durable in production via Upstash REST; local development uses an explicit in-memory fallback. */
export async function takeWitnessRequest(key: string): Promise<GuardResult> {
  const { url, token, budget } = config();
  if (process.env.NODE_ENV === "production" && (!url || !token || !budget)) {
    return { allowed: false, retryAfterSeconds: WINDOW_SECONDS, reason: "configuration" };
  }
  if (!url || !token) return takeLocalRequest(key, budget);
  try {
    const visitor = await incrementRemote(url, token, `elsewhere:witness:${key}`, WINDOW_SECONDS);
    if (visitor > MAX_WITNESS_REQUESTS) return { allowed: false, retryAfterSeconds: WINDOW_SECONDS, reason: "visitor-limit" };
    const global = await incrementRemote(url, token, "elsewhere:witness:global", GLOBAL_WINDOW_SECONDS);
    if (global > budget) return { allowed: false, retryAfterSeconds: GLOBAL_WINDOW_SECONDS, reason: "demo-budget" };
    return { allowed: true, retryAfterSeconds: 0 };
  } catch {
    return { allowed: false, retryAfterSeconds: WINDOW_SECONDS, reason: "configuration" };
  }
}
