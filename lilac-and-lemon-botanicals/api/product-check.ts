import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserId } from './_lib/auth.js';
import { clientIp, throttled } from './_lib/util.js';

export const config = { maxDuration: 30 };

type Item = {
  code: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  tags: string[];
  text: string;
  us: boolean;
};

const FIELDS =
  'code,product_name,brands,image_front_small_url,ingredients_tags,ingredients_text_en,ingredients_text,countries_tags';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; items: Item[] }>();

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function brandSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalize(raw: Record<string, unknown>): Item | null {
  const name = cleanText(raw.product_name, 150);
  const brand = cleanText(raw.brands, 100).split(',')[0].trim();
  if (!name || !brand) return null;

  const rawTags = Array.isArray(raw.ingredients_tags)
    ? (raw.ingredients_tags as unknown[])
    : [];

  const tags = [
    ...new Set(
      rawTags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.replace(/^[a-z]{2}:/, ''))
    ),
  ].slice(0, 200);

  const text =
    cleanText(raw.ingredients_text_en, 1500) ||
    cleanText(raw.ingredients_text, 1500);

  const countries = Array.isArray(raw.countries_tags)
    ? (raw.countries_tags as unknown[])
    : [];

  return {
    code: cleanText(raw.code, 40),
    name,
    brand,
    imageUrl: cleanUrl(raw.image_front_small_url),
    tags,
    text,
    us: countries.includes('en:united-states'),
  };
}

async function obfFetch(url: string): Promise<Item[]> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'RueBeaute/1.0 (ingredient checker)' },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    products?: Record<string, unknown>[];
  };

  const items: Item[] = [];
  for (const raw of data.products ?? []) {
    const item = normalize(raw);
    if (item) items.push(item);
  }
  return items;
}

function textSearchUrl(query: string, size: number): string {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(size),
    fields: FIELDS,
  });
  return `https://world.openbeautyfacts.org/cgi/search.pl?${params}`;
}

async function searchBrand(query: string): Promise<Item[]> {
  const slug = brandSlug(query);
  let items: Item[] = [];

  if (slug) {
    const params = new URLSearchParams({
      brands_tags: slug,
      fields: FIELDS,
      sort_by: 'unique_scans_n',
      page_size: '100',
      json: '1',
    });
    items = await obfFetch(
      `https://world.openbeautyfacts.org/api/v2/search?${params}`
    );
  }

  // Spelling didn't match a brand tag exactly, so fall back to a text search.
  if (items.length === 0) {
    const looseMatches = await obfFetch(textSearchUrl(query, 60));
    const needle = brandSlug(query);
    items = looseMatches.filter((item) =>
      brandSlug(item.brand).includes(needle)
    );
  }

  return items;
}

async function searchProduct(query: string): Promise<Item[]> {
  return obfFetch(textSearchUrl(query, 20));
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserId(req);

  if (!userId) {
    return res.status(401).json({ error: 'Please log in to look up products.' });
  }

  if (throttled(`product-check:${userId}:${clientIp(req)}`, 30, 10 * 60 * 1000)) {
    return res.status(429).json({
      error: 'Too many lookups. Please try again in a few minutes.',
    });
  }

  const body = req.body ?? {};
  const mode = body.mode === 'brand' ? 'brand' : body.mode === 'product' ? 'product' : null;
  const query = cleanText(body.query, 80);

  if (!mode) {
    return res.status(400).json({ error: 'Invalid lookup type.' });
  }

  if (query.length < 2) {
    return res.status(400).json({ error: 'Please type at least 2 characters.' });
  }

  const cacheKey = `${mode}:${query.toLowerCase()}`;
  const cached = cache.get(cacheKey);

  let items: Item[];

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    items = cached.items;
  } else {
    try {
      items = mode === 'brand' ? await searchBrand(query) : await searchProduct(query);
    } catch (error) {
      console.error('Product check failed:', error);
      return res.status(500).json({
        error: 'Something went wrong while looking that up. Please try again.',
      });
    }

    if (cache.size > 200) cache.clear();
    cache.set(cacheKey, { at: Date.now(), items });
  }

  const hasData = (item: Item) => item.tags.length > 0 || item.text.length > 0;

  let skipped = 0;
  let results = items;

  if (mode === 'brand') {
    results = items.filter(hasData);
    skipped = items.length - results.length;
    results = results.sort((a, b) => Number(b.us) - Number(a.us)).slice(0, 80);
  } else {
    results = [...items]
      .sort(
        (a, b) =>
          Number(hasData(b)) - Number(hasData(a)) || Number(b.us) - Number(a.us)
      )
      .slice(0, 10);
  }

  return res.status(200).json({ products: results, skipped });
}
