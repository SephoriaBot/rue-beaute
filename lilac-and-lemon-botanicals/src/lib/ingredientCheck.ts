
import {
  getProfileIngredients,
  skinTypes,
  skinConcerns,
  sensitiveIngredients,
  type Ingredient,
} from './skinIngredients';

export type CheckProduct = {
  name: string;
  brand: string;
  imageUrl: string | null;
  tags: string[];
  text: string;
};

export type Verdict = 'great' | 'good' | 'okay' | 'limited' | 'unknown';

export type CheckResult = {
  verdict: Verdict;
  label: string;
  hits: Ingredient[];
  flags: string[];
  note: string;
  score: number;
};

export const verdictRank: Record<Verdict, number> = {
  great: 4,
  good: 3,
  okay: 2,
  limited: 1,
  unknown: 0,
};

const LABELS: Record<Verdict, string> = {
  great: 'Strong fit',
  good: 'Good fit',
  okay: 'Partial fit',
  limited: 'Weak fit',
  unknown: 'No ingredient data',
};

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Normalize common ingredient naming differences.
const ALIASES: Record<string, string> = {
  'hyaluronic acid': 'sodium hyaluronate',
  'sodium hyaluronate': 'sodium hyaluronate',
  'ceramides': 'ceramide np',
  'ceramide np': 'ceramide np',
  'vitamin b3': 'niacinamide',
  'vitamin b5': 'panthenol',
  'pro vitamin b5': 'panthenol',
  'd panthenol': 'panthenol',
  'vitamin e': 'tocopherol',
  'vitamin c': 'ascorbic acid',
  'green tea': 'camellia sinensis leaf extract',
  'aloe vera': 'aloe barbadensis leaf juice',
  'colloidal oatmeal': 'avena sativa kernel flour',
  'centella asiatica': 'centella asiatica extract',
  'zinc pca': 'zinc pca',
  'bha': 'salicylic acid',
  'aha': 'aha',
  'pha': 'pha',
};

function canonical(value: string): string {
  const normalized = norm(value);
  return ALIASES[normalized] ?? normalized;
}

function extractIngredients(product: CheckProduct): Set<string> {
  const found = new Set<string>();

  for (const tag of product.tags) {
    const value = canonical(tag.replace(/-/g, ' '));
    if (value) found.add(value);
  }

  const text = product.text.replace(/^\s*ingredients?\s*:?/i, '');

  for (const piece of text.split(/[,;]/)) {
    const value = canonical(piece);
    if (value) found.add(value);
  }

  return found;
}

const ALLERGENS = [
  'limonene',
  'linalool',
  'citronellol',
  'geraniol',
  'citral',
  'eugenol',
  'hexyl cinnamal',
  'benzyl salicylate',
  'coumarin',
  'benzyl alcohol',
  'cinnamal',
  'farnesol',
  'isoeugenol',
];

const WATCH: {
  label: string;
  test: (value: string) => boolean;
}[] = [
  {
    label: 'Added fragrance',
    test: (s) => s === 'parfum' || s === 'fragrance' || s === 'aroma',
  },
  {
    label: 'Denatured alcohol',
    test: (s) => s === 'alcohol denat' || s === 'sd alcohol',
  },
  {
    label: 'Fragrance allergens',
    test: (s) => ALLERGENS.includes(s),
  },
  {
    label: 'Essential oils',
    test: (s) =>
      /^(lavandula|mentha|eucalyptus|citrus|cymbopogon|cinnamomum|melaleuca|rosmarinus|pelargonium|cananga)\b/.test(
        s
      ) && /\b(oil|extract)\b/.test(s),
  },
  {
    label: 'Menthol',
    test: (s) => s === 'menthol',
  },
  {
    label: 'Sulfate cleanser',
    test: (s) =>
      s === 'sodium lauryl sulfate' ||
      s === 'sodium laureth sulfate',
  },
];

function getIngredientWeight(
  ingredient: Ingredient,
  skinType: string,
  sensitive: boolean,
  concerns: string[]
): number {
  const primary = skinTypes.find((skin) => skin.value === skinType);

  const isConcernMatch = skinConcerns
    .filter((concern) => concerns.includes(concern.value))
    .some((concern) =>
      concern.ingredients.some((item) => item.tag === ingredient.tag)
    );

  const isSensitiveMatch =
    sensitive &&
    sensitiveIngredients.some((item) => item.tag === ingredient.tag);

  const isPrimaryMatch =
    primary?.ingredients.some((item) => item.tag === ingredient.tag) ?? false;

  // Concern-specific ingredients carry the most weight.
  if (isConcernMatch) return 3;
  if (isSensitiveMatch) return 2;
  if (isPrimaryMatch) return 1.5;

  return 1;
}

export function checkProduct(
  product: CheckProduct,
  skinType: string,
  sensitive: boolean,
  concerns: string[]
): CheckResult {
  const profile = getProfileIngredients(
    skinType,
    sensitive,
    concerns
  );

  const have = extractIngredients(product);

  if (have.size === 0) {
    return {
      verdict: 'unknown',
      label: LABELS.unknown,
      hits: [],
      flags: [],
      note: 'This listing has no ingredient list, so it cannot be scored.',
      score: 0,
    };
  }

  const hits = profile.filter((ingredient) =>
    have.has(canonical(ingredient.tag.replace(/-/g, ' ')))
  );

  const flags = WATCH
    .filter((watch) => [...have].some(watch.test))
    .map((watch) => watch.label);

  const totalWeight = profile.reduce(
    (total, ingredient) =>
      total +
      getIngredientWeight(ingredient, skinType, sensitive, concerns),
    0
  );

  const matchedWeight = hits.reduce(
    (total, ingredient) =>
      total +
      getIngredientWeight(ingredient, skinType, sensitive, concerns),
    0
  );

  const coverage =
    totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;

  let level =
    coverage >= 30 ? 3 :
    coverage >= 18 ? 2 :
    coverage >= 8 ? 1 : 0;

  // Potential sensitivity flags lower the rating by one level.
  if (sensitive && flags.length > 0) {
    level = Math.max(0, level - 1);
  }

  const verdict = (
    ['limited', 'okay', 'good', 'great'] as const
  )[level];

  const noteParts: string[] = [];

  if (hits.length > 0) {
    noteParts.push(
      `${hits.length} profile ingredient${hits.length === 1 ? '' : 's'} found`
    );
  } else {
    noteParts.push('Few or none of your profile ingredients were found');
  }

  if (flags.length > 0) {
    noteParts.push(
      `Contains ${flags.join(', ').toLowerCase()}`
    );
  }

  if (sensitive && flags.length > 0) {
    noteParts.push(
      'These ingredients may be worth reviewing if your skin is sensitive'
    );
  }

  return {
    verdict,
    label: LABELS[verdict],
    hits,
    flags,
    note: `${noteParts.join('. ')}.`,
    score: Math.round(coverage),
  };
}
