
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserId } from './_lib/auth.js';
import { clientIp, throttled } from './_lib/util.js';
import {
  skinTypes,
  skinConcerns,
  productCategories,
  getProfileIngredients,
} from '../src/lib/skinIngredients.js';
import {
  checkProduct,
  type CheckProduct,
} from '../src/lib/ingredientCheck.js';

export const config = { maxDuration: 60 };

type ProductCategory = (typeof productCategories)[number];

type Product = {
  name: string;
  brand: string;
  url: string;
  imageUrl: string | null;
  source: 'database';
  matches: string[];
  category: ProductCategory;
  score: number;
  reason: string;
};

type RawProduct = {
  name: string;
  brand: string;
  imageUrl: string | null;
  categories: string;
  ingredientsText: string;
  ingredientTags: string[];
};

type Candidate = {
  product: Product;
  ingredientsText: string;
  ingredientTags: string[];
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

function shoppingUrl(brand: string, name: string): string {
  const query = `${brand} ${name}`.trim();
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
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
      'code,product_name,brands,image_front_small_url,categories,countries_tags,ingredients_tags',
    page_size: '40',
    json: '1',
  });

  const response = await fetch(
    `https://world.openbeautyfacts.org/api/v2/search?${params}`,
    {
      headers: {
        'User-Agent': 'RueBeaute/1.0 (ingredient finder)',
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) throw new Error(`Open Beauty Facts ${response.status}`);

  const data = (await response.json()) as {
    products?: Record<string, unknown>[];
  };

  const products: RawProduct[] = [];

  for (const product of Array.isArray(data.products) ? data.products : []) {
    const name = cleanText(product.product_name, 150);
    const brand = cleanText(product.brands, 100).split(',')[0].trim();

    const countries = Array.isArray(product.countries_tags)
      ? product.countries_tags
      : [];

    if (!name || !brand) continue;
    if (!countries.includes('en:united-states')) continue;

    const ingredientsText = cleanText(product.ingredients_text, 5000);

    const ingredientTags = Array.isArray(product.ingredients_tags)
      ? product.ingredients_tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) =>
            tag
              .replace(/^[a-z]{2}:/i, '')
              .replace(/-/g, ' ')
          )
      : [];

    if (!ingredientsText && ingredientTags.length === 0) continue;

    products.push({
      name,
      brand,
      imageUrl: cleanUrl(product.image_front_small_url),
      categories: cleanText(product.categories, 300),
      ingredientsText,
      ingredientTags,
    });
  }

  ingredientCache.set(tag, {
    at: Date.now(),
    products,
  });

  return products;
}

async function searchOpenBeautyFacts(
  ingredients: ReturnType<typeof getProfileIngredients>
): Promise<Candidate[]> {
  const byKey = new Map<string, Candidate>();

  // Open Beauty Facts is a free community service, so ask it for a few
  // ingredients at a time instead of all at once, and stop at a deadline.
  const deadline = Date.now() + 40000;
  const results: (PromiseSettledResult<RawProduct[]> | undefined)[] =
    new Array(ingredients.length).fill(undefined);
  let next = 0;

  async function worker() {
    while (next < ingredients.length && Date.now() < deadline) {
      const index = next++;

      try {
        results[index] = {
          status: 'fulfilled',
          value: await fetchIngredientProducts(ingredients[index].tag),
        };
      } catch (reason) {
        console.error(
          `Ingredient lookup failed (${ingredients[index].tag}):`,
          reason
        );
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: 4 }, worker));

  const finished = results.filter(
    (result): result is PromiseSettledResult<RawProduct[]> => !!result
  );

  if (
    finished.length === 0 ||
    finished.every((result) => result.status === 'rejected')
  ) {
    throw new Error('UPSTREAM_UNAVAILABLE');
  }

  results.forEach((result) => {
    if (!result || result.status !== 'fulfilled') return;

    for (const raw of result.value) {
      const key = dedupeKey(raw.brand, raw.name);
      const existing = byKey.get(key);

      if (existing) {
        if (!existing.product.imageUrl && raw.imageUrl) {
          existing.product.imageUrl = raw.imageUrl;
        }

        if (!existing.ingredientsText && raw.ingredientsText) {
          existing.ingredientsText = raw.ingredientsText;
        }

        existing.ingredientTags = [
          ...new Set([
            ...existing.ingredientTags,
            ...raw.ingredientTags,
          ]),
        ];

        continue;
      }

      byKey.set(key, {
        product: {
          name: raw.name,
          brand: raw.brand,
          url: shoppingUrl(raw.brand, raw.name),
          imageUrl: raw.imageUrl,
          source: 'database',
          matches: [],
          category: getCategory(`${raw.name} ${raw.categories}`),
          score: 0,
          reason: '',
        },
        ingredientsText: raw.ingredientsText,
        ingredientTags: raw.ingredientTags,
      });
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

  try {
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

    const body =
      req.body && typeof req.body === 'object' ? req.body : {};

    const skinType = skinTypes.find(
      (skin) => skin.value === body.skinType
    );

    const sensitive = body.sensitive === true;

    const requestedConcerns: string[] = Array.isArray(body.concerns)
      ? body.concerns.filter(
          (value: unknown): value is string =>
            typeof value === 'string'
        )
      : [];

    const requestedCategory =
      typeof body.category === 'string' ? body.category : 'All';

    if (!skinType) {
      return res.status(400).json({
        error: 'Please select a valid skin type.',
      });
    }

    if (
      requestedCategory !== 'All' &&
      !productCategories.includes(requestedCategory as ProductCategory)
    ) {
      return res.status(400).json({
        error: 'Please select a valid product category.',
      });
    }

    const validConcerns = skinConcerns
      .filter((concern) =>
        requestedConcerns.includes(concern.value)
      )
      .map((concern) => concern.value);

    const ingredients = getProfileIngredients(
      skinType.value,
      sensitive,
      validConcerns
    );

    if (ingredients.length === 0) {
      return res.status(400).json({
        error: 'No ingredients were found for this skin profile.',
      });
    }

    const candidates = await searchOpenBeautyFacts(ingredients);

    const filteredCandidates =
      requestedCategory === 'All'
        ? candidates
        : candidates.filter(
            (candidate) =>
              candidate.product.category === requestedCategory
          );

    const ranked = filteredCandidates
      .map((candidate) => {
        const product: CheckProduct = {
          name: candidate.product.name,
          brand: candidate.product.brand,
          imageUrl: candidate.product.imageUrl,
          tags: candidate.ingredientTags,
          text: candidate.ingredientsText,
        };

        const result = checkProduct(
          product,
          skinType.value,
          sensitive,
          validConcerns
        );

        return {
          ...candidate.product,
          matches: result.hits.map((hit) => hit.name),
          score: result.score,
          reason: result.note,
          verdict: result.verdict,
        };
      })
      .filter((product) => product.verdict !== 'unknown')
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return Number(!!b.imageUrl) - Number(!!a.imageUrl);
      })
      .slice(0, 60)
      .map(({ verdict: _verdict, ...product }) => product);

    return res.status(200).json({
      products: ranked,
      total: ranked.length,
      profile: {
        skinType: skinType.value,
        sensitive,
        concerns: validConcerns,
        category: requestedCategory,
      },
    });
  } catch (error) {
    console.error('Product search failed:', error);

    if (error instanceof Error && error.message === 'UPSTREAM_UNAVAILABLE') {
      return res.status(503).json({
        error:
          'The product database is slow right now. Please try again in a minute.',
      });
    }

    return res.status(500).json({
      error: 'Something went wrong while searching for products.',
    });
  }
}
