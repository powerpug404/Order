export const ALLOWED_OPERATIONS = new Set([
  'assistant', 'capture_organization', 'ai_action', 'daily_plan', 'goal_breakdown',
  'goal_settings', 'review', 'search', 'capture', 'question', 'recommendation',
]);

const CONTEXT_KEYS = new Set([
  'date', 'settings', 'activeTimer', 'entries', 'timeCategories', 'tasks', 'goals',
  'events', 'history', 'captures', 'calendars', 'projects', 'lifeAreas', 'review', 'preferences', 'records',
]);
const MAX_MESSAGE = 4000;
const MAX_CONTEXT_BYTES = 24_000;
const MAX_BODY_BYTES = 32_000;

export type AssistantRequest = { message: string; context: Record<string, unknown>; operation: string };
export type ValidationResult = { ok: true; value: AssistantRequest; bytes: number } | { ok: false; error: string; status: number };

function boundedJson(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (typeof value === 'string') return value.length <= 4000;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length <= 250 && value.every(item => boundedJson(item, depth + 1));
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length <= 100 && entries.every(([key, item]) => key.length <= 100 && boundedJson(item, depth + 1));
  }
  return false;
}

export function validateAssistantRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, status: 400, error: 'Request must be a JSON object.' };
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(key => !['message', 'context', 'operation'].includes(key))) return { ok: false, status: 400, error: 'Request contains unsupported fields.' };
  if (typeof input.message !== 'string' || !input.message.trim() || input.message.length > MAX_MESSAGE) return { ok: false, status: 400, error: 'Enter a message under 4,000 characters.' };
  const operation = input.operation === undefined ? 'assistant' : input.operation;
  if (typeof operation !== 'string' || !ALLOWED_OPERATIONS.has(operation)) return { ok: false, status: 400, error: 'Unsupported AI operation.' };
  const context = input.context === undefined ? {} : input.context;
  if (!context || typeof context !== 'object' || Array.isArray(context)) return { ok: false, status: 400, error: 'Context must be a JSON object.' };
  if (Object.keys(context as Record<string, unknown>).some(key => !CONTEXT_KEYS.has(key))) return { ok: false, status: 400, error: 'Context contains unsupported fields.' };
  if (!boundedJson(context)) return { ok: false, status: 413, error: 'Context exceeds an allowed field or collection limit.' };
  let serialized: string;
  try { serialized = JSON.stringify(context); } catch { return { ok: false, status: 400, error: 'Context is not valid JSON.' }; }
  const bytes = new TextEncoder().encode(serialized).length;
  if (bytes > MAX_CONTEXT_BYTES || new TextEncoder().encode(JSON.stringify(input)).length > MAX_BODY_BYTES) return { ok: false, status: 413, error: 'Request is too large. Reduce the amount of context and try again.' };
  return { ok: true, value: { message: input.message.trim(), context: context as Record<string, unknown>, operation }, bytes };
}

export class MemoryRateLimiter {
  private readonly buckets = new Map<string, { start: number; count: number }>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;
  constructor(limit = 20, windowMs = 60_000, maxKeys = 10_000) { this.limit = limit; this.windowMs = windowMs; this.maxKeys = maxKeys; }
  consume(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const current = this.buckets.get(key);
    if (!current || now - current.start >= this.windowMs) {
      if (this.buckets.size >= this.maxKeys) {
        for (const [id, bucket] of this.buckets) if (now - bucket.start >= this.windowMs) this.buckets.delete(id);
        if (this.buckets.size >= this.maxKeys) return { allowed: false, retryAfterSeconds: 60 };
      }
      this.buckets.set(key, { start: now, count: 1 });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.count >= this.limit) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((this.windowMs - (now - current.start)) / 1000)) };
    current.count++;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

const REQUESTS_PER_IP_PER_MINUTE = 10;
const memoryLimiter = new MemoryRateLimiter(REQUESTS_PER_IP_PER_MINUTE, 60_000);
const RATE_LIMIT_SCRIPT = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}";

export async function consumeRateLimit(ip: string, env: Record<string, string | undefined>, now = Date.now()) {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const key = `order-ai:rl:${encodeURIComponent(ip).slice(0, 160)}:${Math.floor(now / 60_000)}`;
    const response = await fetch(url.replace(/\/$/, '') + '/pipeline', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['EVAL', RATE_LIMIT_SCRIPT, '1', key, '60000']]), signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error('Rate-limit service unavailable.');
    const result = await response.json() as Array<{ result?: [number, number] }>;
    const count = Number(result?.[0]?.result?.[0]);
    const ttl = Number(result?.[0]?.result?.[1]);
    if (!Number.isFinite(count) || !Number.isFinite(ttl)) throw new Error('Rate-limit service returned an invalid response.');
    return { allowed: count <= REQUESTS_PER_IP_PER_MINUTE, retryAfterSeconds: count <= REQUESTS_PER_IP_PER_MINUTE ? 0 : Math.max(1, Math.ceil(ttl / 1000)), distributed: true };
  }
  return { ...memoryLimiter.consume(ip), distributed: false };
}

export const assistantLimits = { maxBodyBytes: MAX_BODY_BYTES, maxContextBytes: MAX_CONTEXT_BYTES, maxMessageCharacters: MAX_MESSAGE, maxOutputTokens: 1200, allowedOperations: [...ALLOWED_OPERATIONS] };
