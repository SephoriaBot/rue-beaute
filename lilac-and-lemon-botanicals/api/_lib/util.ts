import type { VercelRequest } from '@vercel/node';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reads an optional text field. Returns:
//   string  -> trimmed text (may be '')
//   null    -> field absent
//   undefined -> present but invalid (not text, or longer than max)
export function readText(v: unknown, max: number): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > max ? undefined : t;
}

// JSON.stringify with a size ceiling. Returns null if it's too big or not serializable.
export function boundedJson(v: unknown, maxChars: number): string | null {
  try {
    const s = JSON.stringify(v);
    return s !== undefined && s.length <= maxChars ? s : null;
  } catch {
    return null;
  }
}

export function safeParse(s: unknown): unknown {
  try {
    return JSON.parse(String(s));
  } catch {
    return null;
  }
}

export function clientIp(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'unknown';
}

// Best-effort in-memory throttle (resets when a server instance restarts).
const buckets = new Map<string, number[]>();
export function throttled(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) buckets.clear();
  return recent.length > max;
}
