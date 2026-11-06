import {
  getProfileIngredients,
  skinTypes,
  skinConcerns,
  sensitiveIngredients,
  type Ingredient,
} from './skinIngredients.js';

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

/* -------------------------------------------------------------------------
 * Roles
 *
 * Ingredients do jobs. Glycerin and sodium hyaluronate both hydrate, so a
 * product shouldn't lose points for having one instead of the other. We score
 * how well a product covers the JOBS a skin profile needs, not how many names
 * from a long list it happens to contain.
 * ---------------------------------------------------------------------- */

type Role =
  | 'hydration'
  | 'barrier'
  | 'soothing'
  | 'antioxidant'
  | 'tone'
  | 'exfoliant'
  | 'clarifying'
  | 'antiaging';

const ROLE_LABELS: Record<Role, string> = {
  hydration: 'hydration',
  barrier: 'barrier support',
  soothing: 'soothing',
  antioxidant: 'antioxidant support',
  tone: 'tone support',
  exfoliant: 'gentle exfoliation',
  clarifying: 'oil and pore balance',
  antiaging: 'smoothing support',
};

const ROLE_BY_TAG: Record<string, Role[]> = {
  // Hydration
  'glycerin': ['hydration'],
  'sodium-hyaluronate': ['hydration'],
  'sodium-pca': ['hydration'],
  'urea': ['hydration'],
  'serine': ['hydration'],
  'ectoin': ['hydration', 'soothing'],
  'beta-glucan': ['hydration', 'soothing'],
  'aloe-barbadensis-leaf-juice': ['hydration', 'soothing'],
  'panthenol': ['hydration', 'soothing'],

  // Barrier / emollients
  'squalane': ['barrier'],
  'ceramide-np': ['barrier'],
  'cholesterol': ['barrier'],
  'linoleic-acid': ['barrier'],
  'butyrospermum-parkii-butter': ['barrier'],
  'mangifera-indica-seed-butter': ['barrier'],
  'simmondsia-chinensis-seed-oil': ['barrier'],
  'limnanthes-alba-seed-oil': ['barrier'],

  // Soothing
  'allantoin': ['soothing'],
  'avena-sativa-kernel-flour': ['soothing'],
  'centella-asiatica-extract': ['soothing'],
  'bisabolol': ['soothing'],
  'madecassoside': ['soothing'],
  'dipotassium-glycyrrhizate': ['soothing'],

  // Antioxidants
  'tocopherol': ['antioxidant'],
  'ubiquinone': ['antioxidant'],
  'ferulic-acid': ['antioxidant'],
  'camellia-sinensis-leaf-extract': ['antioxidant', 'soothing'],
  'ascorbic-acid': ['antioxidant', 'tone'],

  // Tone / brightening
  'niacinamide': ['tone', 'barrier'],
  'glycyrrhiza-glabra-root-extract': ['tone', 'soothing'],
  'tranexamic-acid': ['tone'],
  'alpha-arbutin': ['tone'],
  'kojic-acid': ['tone'],
  'azelaic-acid': ['tone', 'clarifying'],

  // Exfoliants
  'lactic-acid': ['exfoliant'],
  'gluconolactone': ['exfoliant'],
  'mandelic-acid': ['exfoliant'],
  'papain': ['exfoliant'],
  'salicylic-acid': ['exfoliant', 'clarifying'],

  // Oil / pore balance
  'zinc-pca': ['clarifying'],
  'sulfur': ['clarifying'],
  'benzoyl-peroxide': ['clarifying'],
  'hamamelis-virginiana-water': ['clarifying'],
  'carnitine': ['clarifying'],

  // Smoothing
  'retinol': ['antiaging'],
  'bakuchiol': ['antiaging'],
  'palmitoyl-tripeptide-1': ['antiaging'],
};

const ROLES_BY_CANONICAL = new Map<string, Role[]>(
  Object.entries(ROLE_BY_TAG).map(([tag, roles]) => [
    canonical(tag.replace(/-/g, ' ')),
    roles,
  ])
);

function rolesOfTag(tag: string): Role[] {
  return ROLE_BY_TAG[tag] ?? [];
}

// The jobs a skin type genuinely needs: any job that several of its
// recommended ingredients share. One-off extras are nice, not required.
function coreRoles(skinType: string, sensitive: boolean): Role[] {
  const primary = skinTypes.find((skin) => skin.value === skinType);
  if (!primary) return [];

  const list = [
    ...primary.ingredients,
    ...(sensitive ? sensitiveIngredients : []),
  ];

  const counts = new Map<Role, number>();

  for (const ingredient of list) {
    for (const role of rolesOfTag(ingredient.tag)) {
      counts.set(role, (counts.get(role) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([role]) => role);
}

/* -------------------------------------------------------------------------
 * Reading the product
 * ---------------------------------------------------------------------- */

// Returns each ingredient with a weight: 1 for a normal listing, 0.5 for
// ingredients far down a long list, which are usually present in trace amounts.
function extractIngredients(product: CheckProduct): Map<string, number> {
  const found = new Map<string, number>();

  const add = (value: string, weight: number) => {
    if (!value) return;
    if ((found.get(value) ?? 0) < weight) found.set(value, weight);
  };

  for (const tag of product.tags) {
    add(canonical(tag.replace(/-/g, ' ')), 1);
  }

  const text = product.text.replace(/^\s*ingredients?\s*:?/i, '');
  const pieces = text
    .split(/[,;]/)
    .map((piece) => canonical(piece))
    .filter(Boolean);

  pieces.forEach((value, index) => {
    const trace = pieces.length > 15 && index >= 12;
    add(value, trace ? 0.5 : 1);
  });

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

/* -------------------------------------------------------------------------
 * Scoring
 * ---------------------------------------------------------------------- */

export function checkProduct(
  product: CheckProduct,
  skinType: string,
  sensitive: boolean,
  concerns: string[]
): CheckResult {
  const profile = getProfileIngredients(skinType, sensitive, concerns);
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
    .filter((watch) => [...have.keys()].some(watch.test))
    .map((watch) => watch.label);

  // How well does the product cover the jobs this skin type needs?
  const credit = new Map<Role, number>();

  for (const [value, weight] of have) {
    for (const role of ROLES_BY_CANONICAL.get(value) ?? []) {
      credit.set(role, Math.max(credit.get(role) ?? 0, weight));
    }
  }

  const core = coreRoles(skinType, sensitive);

  const coreCoverage =
    core.length > 0
      ? core.reduce((total, role) => total + (credit.get(role) ?? 0), 0) /
        core.length
      : 0;

  // Does it contain at least one ingredient for each selected concern?
  const selectedConcerns = skinConcerns.filter((concern) =>
    concerns.includes(concern.value)
  );

  const concernCredit = selectedConcerns.map((concern) =>
    concern.ingredients.reduce((best, ingredient) => {
      const weight =
        have.get(canonical(ingredient.tag.replace(/-/g, ' '))) ?? 0;
      return Math.max(best, weight);
    }, 0)
  );

  const concernCoverage =
    concernCredit.length > 0
      ? concernCredit.reduce((total, value) => total + value, 0) /
        concernCredit.length
      : 0;

  const parts: { value: number; weight: number }[] = [];
  if (core.length > 0) parts.push({ value: coreCoverage, weight: 0.6 });
  if (selectedConcerns.length > 0) {
    parts.push({ value: concernCoverage, weight: 0.4 });
  }

  const totalPartWeight = parts.reduce((total, part) => total + part.weight, 0);

  const score =
    totalPartWeight > 0
      ? (parts.reduce((total, part) => total + part.value * part.weight, 0) /
          totalPartWeight) *
        100
      : 0;

  let level = score >= 75 ? 3 : score >= 55 ? 2 : score >= 30 ? 1 : 0;

  // Potential irritants only lower the rating for sensitive skin.
  if (sensitive && flags.length > 0) {
    level = Math.max(0, level - (flags.length >= 2 ? 2 : 1));
  }

  const verdict = (['limited', 'okay', 'good', 'great'] as const)[level];

  // Explain the result in plain language.
  const noteParts: string[] = [];

  if (core.length === 0 && selectedConcerns.length === 0) {
    noteParts.push('Pick a skin type or concern to see how well this fits');
  }

  const coveredCore = core.filter((role) => (credit.get(role) ?? 0) > 0);
  const missingCore = core.filter((role) => (credit.get(role) ?? 0) === 0);

  if (coveredCore.length > 0) {
    noteParts.push(
      `Covers ${coveredCore.map((role) => ROLE_LABELS[role]).join(', ')}`
    );
  }

  if (missingCore.length > 0) {
    noteParts.push(
      `Light on ${missingCore.map((role) => ROLE_LABELS[role]).join(', ')}`
    );
  }

  const hitConcerns = selectedConcerns.filter(
    (_, index) => concernCredit[index] > 0
  );
  const missedConcerns = selectedConcerns.filter(
    (_, index) => concernCredit[index] === 0
  );

  if (hitConcerns.length > 0) {
    noteParts.push(
      `Targets ${hitConcerns.map((c) => c.label.toLowerCase()).join(', ')}`
    );
  }

  if (missedConcerns.length > 0) {
    noteParts.push(
      `Does not specifically target ${missedConcerns
        .map((c) => c.label.toLowerCase())
        .join(', ')}`
    );
  }

  if (flags.length > 0) {
    noteParts.push(`Contains ${flags.join(', ').toLowerCase()}`);
    if (sensitive) {
      noteParts.push(
        'These may be worth reviewing if your skin is sensitive'
      );
    }
  }

  return {
    verdict,
    label: LABELS[verdict],
    hits,
    flags,
    note: noteParts.length > 0 ? `${noteParts.join('. ')}.` : '',
    score: Math.round(score),
  };
}
