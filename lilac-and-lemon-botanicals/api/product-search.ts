
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserId } from './_lib/auth.js';
import { clientIp, throttled } from './_lib/util.js';
import {
  skinTypes,
  skinConcerns,
  sensitiveIngredients,
  type Ingredient,
} from '../src/lib/skinIngredients.js';
import {
  checkProduct,
  verdictRank,
  type CheckProduct,
} from '../src/lib/ingredientCheck.js';

export const config = { maxDuration: 60 };

type ProductCategory =
  | 'Cleansers'
  | 'Toners'
  | 'Serums & Treatments'
  | 'Moisturizers'
  | 'Exfoliators'
  | 'Sunscreens'
  | 'Masks'
  | 'Eye Care'
  | 'Other';

type Product = CheckProduct & {
  url: string;
  source: 'database';
  matches: string[];
  category: ProductCategory;
  score: number;
  verdict: string;
  label: string;
  flags: string[];
  reason: string;
};

type RawProduct = {
  name: string;
  brand: string;
  imageUrl: string | null;
  categories: string;
  tags: string[];
  text: string;
};

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

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function getCategory(value: string): ProductCategory {
  const name = value.toLowerCase();

  if (/sunscreen|sun screen|spf|sun protection/.test(name)) return 'Sunscreens';
  if (/cleanser|cleansing|face wash|facial wash/.test(name)) return 'Cleansers';
  if (/toner|essence|mist/.test(name)) return 'Toners';
  if (/exfoliat|peel|scrub|resurfacing/.test(name)) return 'Exfoliators';
  if (/mask|masque/.test(name)) return 'Masks';
  if (/eye cream|eye serum|eye gel|eye treatment/.test(name)) return 'Eye Care';
  if (/serum|treatment|ampoule|spot corrector/.test(name)) return 'Serums & Treatments';
  if (/moistur|cream|lotion|gel cream|face oil|facial oil|balm/.test(name)) return 'Moisturizers';

  return 'Other';
}

const KNOWN_BRANDS = [
  'cerave', 'cetaphil', 'the ordinary', 'neutrogena', 'la roche posay',
  'aveeno', 'vanicream', 'eucerin', 'olay', 'paulas choice', 'paula s choice',
  'cosrx', 'beauty of joseon', 'clinique', 'kiehls', 'kiehl s',
  'drunk elephant', 'tatcha', 'glow recipe', 'first aid beauty', 'bioderma',
  'avene', 'vichy', 'dove', 'nivea', 'garnier', 'loreal', 'l oreal',
  'burts bees', 'burt s bees', 'cocokind', 'the inkey list', 'inkey list',
  'supergoop', 'elf', 'e l f', 'skinfix', 'sunday riley',
  'youth to the people', 'farmacy', 'origins', 'estee lauder', 'lancome',
  'shiseido', 'innisfree', 'laneige', 'dr jart', 'sol de janeiro', 'murad',
  'peter thomas roth', 'skinceuticals', 'differin', 'curel', 'jergens',
  'st ives', 'ponds', 'pond s', 'simple', 'biossance', 'summer fridays',
  'fresh', 'herbivore', 'mario badescu', 'acure', 'alba botanica', 'derma e',
  'versed', 'naturium', 'good molecules', 'byoma', 'hero cosmetics',
  'topicals', 'la mer', 'olaplex', 'cantu', 'maybelline', 'revlon',
  'coppertone', 'banana boat', 'sun bum', 'blue lizard',
];

function isKnownBrand(brand: string): boolean {
  const normalized = brand
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return KNOWN_BRANDS.some(
    (known) => normalized === known || normalized.startsWith(`${known} `)
  );
}

function getIngredients(
  skinTypeValue: string,
  sensitive: boolean,
  concernValues: string[]
): Ingredient[] {
  const primary = skinTypes.find((s) => s.value === skinTypeValue);
  if (!primary) return [];

  const selectedConcerns = skinConcerns.filter((concern) =>
    concernValues.includes(concern.value)
  );

  const all = [
    ...primary.ingredients,
    ...(sensitive ? sensitiveIngredients : []),
    ...selectedConcerns.flatMap((concern) => concern.ingredients),
  ];

  const unique = new Map<string, Ingredient>();

  for (const ingredient of all) {
    if (!unique.has(ingredient.tag)) {
      unique.set(ingredient.tag, ingredient);
    }
  }

  return [...unique.values()];
}

function shoppingUrl(brand: string, name: string): string {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
    `${brand} ${name}`.trim()
  )}`;
}

function dedupeKey(brand: string, name: string): string {
  return `${brand}|${name}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ingredientCache = new Map<
  string,
  { at: number; products: RawProduct[] }
>();

async function fetchIngredientProducts(tag: string): Promise<RawProduct[]> {
  const cached = ingredientCache.get(tag);

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.products;
  }

  const params = new URLSearchParams({
    ingredients_tags: `en:${tag}`,
    fields:
      'code,product_name,brands,image_front_small_url,categories,countries_tags,ingredients_tags,ingredients_text_en,ingredients_text',
    sort_by: 'unique_scans_n',
    page_size: '100',
    json: '1',
  });

  const response = await fetch(
    `https://world.openbeautyfacts.org/api/v2/search?${params}`,
    {
      headers: { 'User-Agent': 'RueBeaute/1.0 (ingredient finder)' },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    throw new Error(`Open Beauty Facts ${response.status}`);
  }

  const data = (await response.json()) as {
    products?: Record<string, unknown>[];
  };

  const products: RawProduct[] = [];

  for (const product of data.products ?? []) {
    const name = cleanText(product.product_name, 150);
    const brand = cleanText(product.brands, 100).split(',')[0].trim();

    const countries = Array.isArray(product.countries_tags)
      ? product.countries_tags as unknown[]
      : [];

    if (!name || !brand || !countries.includes('en:united-states')) {
      continue;
    }

    const rawTags = Array.isArray(product.ingredients_tags)
      ? product.ingredients_tags as unknown[]
      : [];

    const tags = [
      ...new Set(
        rawTags
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.replace(/^[a-z]{2}:/, ''))
      ),
    ].slice(0, 200);

    const text =
      cleanText(product.ingredients_text_en, 1500) ||
      cleanText(product.ingredients_text, 1500);

    products.push({
      name,
      brand,
      imageUrl: cleanUrl(product.image_front_small_url),
      categories: cleanText(product.categories, 300),
      tags,
      text,
    });
  }

  ingredientCache.set(tag, { at: Date.now(), products });

  return products;
}

async function searchOpenBeautyFacts(
  ingredients: Ingredient[]
): Promise<RawProduct[]> {
  const byKey = new Map<string, RawProduct>();

  const results = await Promise.allSettled(
    ingredients.map((ingredient) =>
      fetchIngredientProducts(ingredient.tag)
    )
  );

  if (results.every((result) => result.status === 'rejected')) {
    throw new Error('UPSTREAM_UNAVAILABLE');
  }

  results.forEach((result) => {
    if (result.status !== 'fulfilled') return;

    for (const product of result.value) {
      const key = dedupeKey(product.brand, product.name);
      const existing = byKey.get(key);

      if (existing) {
        existing.tags = [
          ...new Set([...existing.tags, ...product.tags]),
        ].slice(0, 200);

        if (!existing.imageUrl && product.imageUrl) {
          existing.imageUrl = product.imageUrl;
        }

        if (!existing.text && product.text) {
          existing.text = product.text;
        }

        if (!existing.categories && product.categories) {
          existing.categories = product.categories;
        }
      } else {
        byKey.set(key, { ...product });
      }
    }
  });

  return [...byKey.values()];
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
    return res.status(401).json({
      error: 'Please log in to search products.',
    });
  }

  if (
    throttled(
      `product-search:${userId}:${clientIp(req)}`,
      10,
      10 * 60 * 1000
    )
  ) {
    return res.status(429).json({
      error: 'Too many searches. Please try again in a few minutes.',
    });
  }

  const body = req.body ?? {};
  const skinType = skinTypes.find((s) => s.value === body.skinType);
  const sensitive = body.sensitive === true;

  const requestedConcerns: string[] = Array.isArray(body.concerns)
    ? body.concerns.filter(
        (value: unknown): value is string => typeof value === 'string'
      )
    : [];

  if (!skinType) {
    return res.status(400).json({
      error: 'Please select a valid skin type.',
    });
  }

  const requestedCategory =
    typeof body.category === 'string' ? body.category : 'All';

  const validConcerns = skinConcerns
    .filter((concern) => requestedConcerns.includes(concern.value))
    .map((concern) => concern.value);

  const ingredients = getIngredients(
    skinType.value,
    sensitive,
    validConcerns
  );

  if (ingredients.length === 0) {
    return res.status(400).json({
      error: 'No ingredients were found for this skin profile.',
    });
  }

  try {
    const rawProducts = await searchOpenBeautyFacts(ingredients);

    const ranked: Product[] = rawProducts
      .filter(
        (product) =>
          requestedCategory === 'All' ||
          getCategory(`${product.name} ${product.categories}`) === requestedCategory
      )
      .map((product) => {
        const checkProductData: CheckProduct = {
          name: product.name,
          brand: product.brand,
          imageUrl: product.imageUrl,
          tags: product.tags,
          text: product.text,
        };

        const result = checkProduct(
          checkProductData,
          skinType.value,
          sensitive,
          validConcerns
        );

        return {
          ...checkProductData,
          url: shoppingUrl(product.brand, product.name),
          source: 'database' as const,
          matches: result.hits.map((hit) => hit.name),
          category: getCategory(`${product.name} ${product.categories}`),
          score: result.score,
          verdict: result.verdict,
          label: result.label,
          flags: result.flags,
          reason: result.note,
        };
      })
      .sort((a, b) => {
        const verdictDifference =
          verdictRank[b.verdict as keyof typeof verdictRank] -
          verdictRank[a.verdict as keyof typeof verdictRank];

        if (verdictDifference !== 0) return verdictDifference;
        if (b.score !== a.score) return b.score - a.score;

        const knownA = isKnownBrand(a.brand);
        const knownB = isKnownBrand(b.brand);

        if (knownA !== knownB) {
          return Number(knownB) - Number(knownA);
        }

        return Number(!!b.imageUrl) - Number(!!a.imageUrl);
      })
      .slice(0, 60);

    return res.status(200).json({
      products: ranked,
      total: ingredients.length,
      profile: {
        skinType: skinType.value,
        sensitive,
        concerns: validConcerns,
      },
    });
  } catch (error) {
    console.error('Product search failed:', error);

    if (error instanceof Error && error.message === 'UPSTREAM_UNAVAILABLE') {
      return res.status(503).json({
        error:
          'The product database (Open Beauty Facts) is not responding right now. Please try again later.',
      });
    }

    return res.status(500).json({
      error: 'Something went wrong while searching for products.',
    });
  }
}
