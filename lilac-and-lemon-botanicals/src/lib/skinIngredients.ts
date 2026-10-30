
export type Ingredient = {
  name: string;
  tag: string;
  why: string;
};

export type SkinType = {
  value: string;
  label: string;
  blurb: string;
  ingredients: Ingredient[];
};

export type SkinConcern = {
  value: string;
  label: string;
  ingredients: Ingredient[];
};

export const skinTypes: SkinType[] = [
  {
    value: 'dry',
    label: 'Dry',
    blurb: 'Prioritize hydration, replenishing lipids, and ingredients that support a healthy moisture barrier.',
    ingredients: [
      { name: 'Squalane', tag: 'squalane', why: 'Softens skin and helps reduce moisture loss.' },
      { name: 'Ceramides', tag: 'ceramide-np', why: 'Help replenish the skin barrier.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Attracts water to improve skin hydration.' },
      { name: 'Glycerin', tag: 'glycerin', why: 'A reliable humectant that draws moisture into skin.' },
      { name: 'Shea butter', tag: 'butyrospermum-parkii-butter', why: 'Rich emollient that softens rough, dry areas.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Helps soothe and support the moisture barrier.' },
      { name: 'Urea', tag: 'urea', why: 'Hydrates and softens rough skin.' },
      { name: 'Beta-glucan', tag: 'beta-glucan', why: 'Helps hydrate and soothe dry, stressed skin.' },
      { name: 'Cholesterol', tag: 'cholesterol', why: 'A skin-identical lipid that supports barrier function.' },
      { name: 'Fatty acids', tag: 'linoleic-acid', why: 'Help replenish lipids in the skin barrier.' },
      { name: 'Jojoba oil', tag: 'simmondsia-chinensis-seed-oil', why: 'Provides emollient support and softens skin.' },
      { name: 'Colloidal oatmeal', tag: 'avena-sativa-kernel-flour', why: 'Helps soothe dry and uncomfortable skin.' },
      { name: 'Sodium PCA', tag: 'sodium-pca', why: 'A natural moisturizing factor that helps retain water.' },
      { name: 'Amino acids', tag: 'serine', why: 'Support hydration and skin conditioning.' },
      { name: 'Ectoin', tag: 'ectoin', why: 'Helps protect skin from environmental stress and dehydration.' },
      { name: 'Allantoin', tag: 'allantoin', why: 'Softens and comforts dry, rough skin.' },
      { name: 'Mango butter', tag: 'mangifera-indica-seed-butter', why: 'Provides rich emollient conditioning.' },
      { name: 'Meadowfoam seed oil', tag: 'limnanthes-alba-seed-oil', why: 'Helps soften skin and reduce moisture loss.' },
    ],
  },
  {
    value: 'normal',
    label: 'Normal',
    blurb: 'Maintain balance with everyday hydration, antioxidant protection, and barrier support.',
    ingredients: [
      { name: 'Glycerin', tag: 'glycerin', why: 'Provides dependable everyday hydration.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Helps maintain a hydrated, plump appearance.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Supports barrier function and a more even-looking tone.' },
      { name: 'Vitamin C', tag: 'ascorbic-acid', why: 'Provides antioxidant support and helps brighten dull-looking skin.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Supports hydration and skin comfort.' },
      { name: 'Squalane', tag: 'squalane', why: 'Lightweight emollient that softens without a heavy feel.' },
      { name: 'Green tea', tag: 'camellia-sinensis-leaf-extract', why: 'Provides antioxidant support.' },
      { name: 'Ceramides', tag: 'ceramide-np', why: 'Help maintain a healthy skin barrier.' },
      { name: 'Peptides', tag: 'palmitoyl-tripeptide-1', why: 'Condition skin and support a smoother-looking appearance.' },
      { name: 'Coenzyme Q10', tag: 'ubiquinone', why: 'An antioxidant that helps protect against oxidative stress.' },
      { name: 'Vitamin E', tag: 'tocopherol', why: 'Antioxidant support and skin conditioning.' },
      { name: 'Beta-glucan', tag: 'beta-glucan', why: 'Helps hydrate and soothe skin.' },
      { name: 'Ectoin', tag: 'ectoin', why: 'Helps protect against environmental stress.' },
      { name: 'Allantoin', tag: 'allantoin', why: 'Helps keep skin feeling comfortable.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Provides lightweight hydration and soothing.' },
      { name: 'Sodium PCA', tag: 'sodium-pca', why: 'Supports the skin’s natural moisturizing factors.' },
      { name: 'Ferulic acid', tag: 'ferulic-acid', why: 'Antioxidant support, often paired with vitamins C and E.' },
      { name: 'Licorice root', tag: 'glycyrrhiza-glabra-root-extract', why: 'Helps improve the appearance of uneven tone.' },
    ],
  },
  {
    value: 'combination',
    label: 'Combination',
    blurb: 'Balance oilier areas while maintaining hydration and comfort in drier areas.',
    ingredients: [
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Supports barrier health and helps improve the look of excess oil.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Hydrates without relying on heavy oils.' },
      { name: 'Glycerin', tag: 'glycerin', why: 'Provides lightweight hydration.' },
      { name: 'Squalane', tag: 'squalane', why: 'Softens dry areas without a heavy finish.' },
      { name: 'Green tea', tag: 'camellia-sinensis-leaf-extract', why: 'Offers antioxidant and soothing support.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Helps keep skin hydrated and comfortable.' },
      { name: 'Zinc PCA', tag: 'zinc-pca', why: 'Often used in formulas for oily and blemish-prone skin.' },
      { name: 'Salicylic acid', tag: 'salicylic-acid', why: 'Helps exfoliate inside oil-prone pores.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Lightweight hydration and soothing.' },
      { name: 'Beta-glucan', tag: 'beta-glucan', why: 'Hydrates while helping calm skin.' },
      { name: 'Allantoin', tag: 'allantoin', why: 'Helps soothe and condition skin.' },
      { name: 'Azelaic acid', tag: 'azelaic-acid', why: 'Helps improve the appearance of blemishes and uneven tone.' },
      { name: 'PHA (gluconolactone)', tag: 'gluconolactone', why: 'Provides gentle exfoliation and hydration.' },
      { name: 'Lactic acid', tag: 'lactic-acid', why: 'Exfoliates and can also support surface hydration.' },
      { name: 'Ectoin', tag: 'ectoin', why: 'Helps protect skin from environmental stress.' },
      { name: 'Licorice root', tag: 'glycyrrhiza-glabra-root-extract', why: 'Helps improve the appearance of uneven tone.' },
      { name: 'Centella asiatica', tag: 'centella-asiatica-extract', why: 'Helps soothe and condition skin.' },
      { name: 'Sodium PCA', tag: 'sodium-pca', why: 'Provides lightweight moisture retention.' },
    ],
  },
  {
    value: 'oily',
    label: 'Oily',
    blurb: 'Look for lightweight hydration, pore-clearing exfoliants, and ingredients that support balanced skin.',
    ingredients: [
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Supports barrier health and helps improve the look of excess oil.' },
      { name: 'Salicylic acid', tag: 'salicylic-acid', why: 'Oil-soluble exfoliant that helps clear congested pores.' },
      { name: 'Zinc PCA', tag: 'zinc-pca', why: 'Commonly used in products for oily and blemish-prone skin.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Provides hydration without a heavy finish.' },
      { name: 'Green tea', tag: 'camellia-sinensis-leaf-extract', why: 'Antioxidant support for oily, blemish-prone skin.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Lightweight hydration and soothing.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Helps maintain hydration and skin comfort.' },
      { name: 'Azelaic acid', tag: 'azelaic-acid', why: 'Helps improve the appearance of blemishes and uneven tone.' },
      { name: 'Lactic acid', tag: 'lactic-acid', why: 'Helps exfoliate dead surface cells.' },
      { name: 'Gluconolactone', tag: 'gluconolactone', why: 'A gentle exfoliating PHA with humectant properties.' },
      { name: 'Sulfur', tag: 'sulfur', why: 'Often used in products targeting blemishes and excess oil.' },
      { name: 'Allantoin', tag: 'allantoin', why: 'Helps soothe and condition skin.' },
      { name: 'Centella asiatica', tag: 'centella-asiatica-extract', why: 'Helps calm and condition blemish-prone skin.' },
      { name: 'Witch hazel', tag: 'hamamelis-virginiana-water', why: 'Provides an astringent feel in some formulas.' },
      { name: 'Sodium PCA', tag: 'sodium-pca', why: 'Hydrates without a rich or oily texture.' },
      { name: 'Ectoin', tag: 'ectoin', why: 'Helps protect against environmental stress.' },
      { name: 'L-carnitine', tag: 'carnitine', why: 'Used in some formulations designed for oily skin.' },
      { name: 'Retinol', tag: 'retinol', why: 'Can improve the appearance of clogged pores and uneven texture.' },
    ],
  },
];

export const sensitiveIngredients: Ingredient[] = [
  { name: 'Panthenol', tag: 'panthenol', why: 'Helps soothe and support the skin barrier.' },
  { name: 'Allantoin', tag: 'allantoin', why: 'Helps calm and condition uncomfortable skin.' },
  { name: 'Colloidal oatmeal', tag: 'avena-sativa-kernel-flour', why: 'Helps soothe dry, itchy-feeling skin.' },
  { name: 'Centella asiatica', tag: 'centella-asiatica-extract', why: 'Helps soothe and condition the skin.' },
  { name: 'Beta-glucan', tag: 'beta-glucan', why: 'Supports hydration and skin comfort.' },
  { name: 'Ceramides', tag: 'ceramide-np', why: 'Help maintain the skin barrier.' },
  { name: 'Squalane', tag: 'squalane', why: 'A gentle-feeling emollient that softens skin.' },
  { name: 'Glycerin', tag: 'glycerin', why: 'Provides gentle, effective hydration.' },
  { name: 'Ectoin', tag: 'ectoin', why: 'Helps protect skin from environmental stress.' },
  { name: 'Bisabolol', tag: 'bisabolol', why: 'A soothing skin-conditioning ingredient.' },
  { name: 'Madecassoside', tag: 'madecassoside', why: 'A centella-derived ingredient used in calming formulas.' },
  { name: 'Dipotasium glycyrrhizate', tag: 'dipotassium-glycyrrhizate', why: 'A licorice-derived ingredient used to soothe skin.' },
];

export const skinConcerns: SkinConcern[] = [
  {
    value: 'acne',
    label: 'Acne & breakouts',
    ingredients: [
      { name: 'Salicylic acid', tag: 'salicylic-acid', why: 'Helps exfoliate inside congested pores.' },
      { name: 'Azelaic acid', tag: 'azelaic-acid', why: 'Helps improve the appearance of blemishes and post-breakout marks.' },
      { name: 'Benzoyl peroxide', tag: 'benzoyl-peroxide', why: 'An acne-treatment ingredient that targets acne-causing bacteria.' },
      { name: 'Sulfur', tag: 'sulfur', why: 'Often used in blemish-focused treatments.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Supports the barrier and helps improve the look of post-breakout discoloration.' },
    ],
  },
  {
    value: 'pores',
    label: 'Blackheads & clogged pores',
    ingredients: [
      { name: 'Salicylic acid', tag: 'salicylic-acid', why: 'Oil-soluble exfoliant that helps clear pores.' },
      { name: 'Retinol', tag: 'retinol', why: 'Helps improve the appearance of clogged pores and uneven texture.' },
      { name: 'Gluconolactone', tag: 'gluconolactone', why: 'Provides gentle surface exfoliation.' },
      { name: 'Lactic acid', tag: 'lactic-acid', why: 'Helps loosen dead surface cells.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Helps improve the appearance of enlarged pores.' },
    ],
  },
  {
    value: 'redness',
    label: 'Redness & irritation',
    ingredients: [
      { name: 'Centella asiatica', tag: 'centella-asiatica-extract', why: 'Helps soothe and condition skin.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Supports hydration and skin comfort.' },
      { name: 'Allantoin', tag: 'allantoin', why: 'Helps calm and soften skin.' },
      { name: 'Bisabolol', tag: 'bisabolol', why: 'A soothing skin-conditioning ingredient.' },
      { name: 'Colloidal oatmeal', tag: 'avena-sativa-kernel-flour', why: 'Helps comfort dry, itchy-feeling skin.' },
      { name: 'Madecassoside', tag: 'madecassoside', why: 'A centella-derived ingredient used in calming formulas.' },
    ],
  },
  {
    value: 'uneven-tone',
    label: 'Uneven tone & dark spots',
    ingredients: [
      { name: 'Vitamin C', tag: 'ascorbic-acid', why: 'Antioxidant that helps brighten uneven-looking tone.' },
      { name: 'Azelaic acid', tag: 'azelaic-acid', why: 'Helps improve the appearance of discoloration.' },
      { name: 'Tranexamic acid', tag: 'tranexamic-acid', why: 'Used in formulas targeting the appearance of dark spots.' },
      { name: 'Alpha arbutin', tag: 'alpha-arbutin', why: 'Helps improve the appearance of uneven pigmentation.' },
      { name: 'Licorice root', tag: 'glycyrrhiza-glabra-root-extract', why: 'Helps brighten the look of uneven tone.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Helps improve the appearance of discoloration.' },
      { name: 'Kojic acid', tag: 'kojic-acid', why: 'Used in products targeting the appearance of dark spots.' },
    ],
  },
  {
    value: 'fine-lines',
    label: 'Fine lines & wrinkles',
    ingredients: [
      { name: 'Retinol', tag: 'retinol', why: 'Helps improve the appearance of fine lines and uneven texture.' },
      { name: 'Peptides', tag: 'palmitoyl-tripeptide-1', why: 'Support a smoother-looking appearance.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Hydrates to soften the appearance of fine lines.' },
      { name: 'Vitamin C', tag: 'ascorbic-acid', why: 'Provides antioxidant support.' },
      { name: 'Coenzyme Q10', tag: 'ubiquinone', why: 'Antioxidant support for skin exposed to environmental stress.' },
      { name: 'Bakuchiol', tag: 'bakuchiol', why: 'A plant-derived ingredient used in smoothing-focused formulas.' },
      { name: 'Vitamin E', tag: 'tocopherol', why: 'Provides antioxidant and skin-conditioning support.' },
    ],
  },
  {
    value: 'dehydration',
    label: 'Dehydration',
    ingredients: [
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Attracts water to help plump the skin.' },
      { name: 'Glycerin', tag: 'glycerin', why: 'Draws moisture into the skin.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Supports hydration and skin comfort.' },
      { name: 'Beta-glucan', tag: 'beta-glucan', why: 'Helps hydrate and soothe.' },
      { name: 'Sodium PCA', tag: 'sodium-pca', why: 'Helps skin retain water.' },
      { name: 'Urea', tag: 'urea', why: 'A humectant that improves skin hydration.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Provides lightweight hydration.' },
      { name: 'Ectoin', tag: 'ectoin', why: 'Helps protect against environmental dehydration.' },
    ],
  },
  {
    value: 'dullness',
    label: 'Dullness & uneven texture',
    ingredients: [
      { name: 'Lactic acid', tag: 'lactic-acid', why: 'Helps exfoliate dead surface cells.' },
      { name: 'Gluconolactone', tag: 'gluconolactone', why: 'Provides gentle exfoliation.' },
      { name: 'Vitamin C', tag: 'ascorbic-acid', why: 'Helps brighten dull-looking skin.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Supports a more even-looking complexion.' },
      { name: 'Mandelic acid', tag: 'mandelic-acid', why: 'An AHA used to improve the appearance of uneven texture.' },
      { name: 'Ferulic acid', tag: 'ferulic-acid', why: 'Provides antioxidant support.' },
      { name: 'Papain', tag: 'papain', why: 'An enzyme used in some exfoliating products.' },
    ],
  },
];

export const productCategories = [
  'Cleansers',
  'Toners',
  'Serums & Treatments',
  'Moisturizers',
  'Exfoliators',
  'Sunscreens',
  'Masks',
  'Eye Care',
  'Other',
];

export function getProfileIngredients(
  skinTypeValue: string,
  sensitive: boolean,
  concernValues: string[]
): Ingredient[] {
  const primary = skinTypes.find((skin) => skin.value === skinTypeValue);
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
