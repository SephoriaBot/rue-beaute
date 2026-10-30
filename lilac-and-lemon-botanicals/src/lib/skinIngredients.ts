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
    blurb: 'Focus on replenishing moisture, softening the skin, and supporting the skin barrier.',
    ingredients: [
      { name: 'Squalane', tag: 'squalane', why: 'A lightweight emollient that softens skin and helps reduce moisture loss.' },
      { name: 'Ceramides', tag: 'ceramide-np', why: 'Help support the skin barrier and reduce moisture loss.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'A humectant that attracts water to help keep skin hydrated.' },
      { name: 'Shea butter', tag: 'butyrospermum-parkii-butter', why: 'A rich emollient that helps soften dry, rough areas.' },
      { name: 'Glycerin', tag: 'glycerin', why: 'A dependable humectant that helps maintain hydration.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Helps condition skin and support a comfortable skin barrier.' },
    ],
  },
  {
    value: 'normal',
    label: 'Normal',
    blurb: 'Maintain balance with gentle hydration, barrier support, and antioxidant care.',
    ingredients: [
      { name: 'Glycerin', tag: 'glycerin', why: 'Provides everyday hydration without a heavy feel.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Helps attract water to keep skin hydrated.' },
      { name: 'Vitamin C', tag: 'ascorbic-acid', why: 'An antioxidant that can help improve the appearance of uneven tone.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Supports the skin barrier and helps improve the appearance of uneven tone.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Helps condition skin and maintain comfort.' },
    ],
  },
  {
    value: 'combination',
    label: 'Combination',
    blurb: 'Balance oilier areas while keeping drier areas hydrated and comfortable.',
    ingredients: [
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Supports the skin barrier and can help improve the appearance of excess oil.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Provides lightweight hydration across different areas of the face.' },
      { name: 'Glycerin', tag: 'glycerin', why: 'A lightweight humectant that helps maintain hydration.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Provides lightweight conditioning and hydration.' },
      { name: 'Squalane', tag: 'squalane', why: 'A lightweight emollient that softens dry areas without a particularly heavy feel.' },
    ],
  },
  {
    value: 'oily',
    label: 'Oily',
    blurb: 'Look for lightweight hydration and ingredients that support balanced-looking skin.',
    ingredients: [
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Can help improve the appearance of excess oil and uneven skin tone.' },
      { name: 'Salicylic acid', tag: 'salicylic-acid', why: 'An oil-soluble exfoliating ingredient that can help clear clogged pores.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Provides hydration without relying on heavy oils.' },
      { name: 'Green tea extract', tag: 'camellia-sinensis-leaf-extract', why: 'Provides antioxidant support and helps condition skin.' },
      { name: 'Aloe vera', tag: 'aloe-barbadensis-leaf-juice', why: 'Provides lightweight hydration and conditioning.' },
    ],
  },
];

export const sensitiveIngredients: Ingredient[] = [
  { name: 'Centella asiatica (cica)', tag: 'centella-asiatica-extract', why: 'A soothing botanical commonly used in products for reactive skin.' },
  { name: 'Panthenol', tag: 'panthenol', why: 'Helps condition skin and support a comfortable skin barrier.' },
  { name: 'Ceramides', tag: 'ceramide-np', why: 'Help support the skin barrier.' },
  { name: 'Allantoin', tag: 'allantoin', why: 'A skin-conditioning ingredient often used in gentle formulas.' },
  { name: 'Colloidal oatmeal', tag: 'avena-sativa-kernel-flour', why: 'Helps soothe and condition dry or uncomfortable skin.' },
  { name: 'Glycerin', tag: 'glycerin', why: 'Provides gentle hydration.' },
];

export const skinConcerns: SkinConcern[] = [
  {
    value: 'acne',
    label: 'Acne & breakouts',
    ingredients: [
      { name: 'Salicylic acid', tag: 'salicylic-acid', why: 'Can help exfoliate inside pores and reduce the appearance of congestion.' },
      { name: 'Benzoyl peroxide', tag: 'benzoyl-peroxide', why: 'An acne-focused ingredient that targets acne-causing bacteria.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Can help improve the appearance of blemishes and uneven tone.' },
      { name: 'Azelaic acid', tag: 'azelaic-acid', why: 'Can help improve the appearance of blemishes and post-breakout marks.' },
    ],
  },
  {
    value: 'blackheads',
    label: 'Blackheads & clogged pores',
    ingredients: [
      { name: 'Salicylic acid', tag: 'salicylic-acid', why: 'An oil-soluble exfoliant that can help clear pore buildup.' },
      { name: 'Glycolic acid', tag: 'glycolic-acid', why: 'An exfoliating acid that helps remove buildup on the skin surface.' },
      { name: 'Lactic acid', tag: 'lactic-acid', why: 'A surface exfoliant that can help smooth uneven texture.' },
    ],
  },
  {
    value: 'redness',
    label: 'Redness',
    ingredients: [
      { name: 'Centella asiatica (cica)', tag: 'centella-asiatica-extract', why: 'A soothing botanical used in products for visibly stressed skin.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Helps condition skin and support barrier comfort.' },
      { name: 'Allantoin', tag: 'allantoin', why: 'Helps soothe and condition the skin.' },
      { name: 'Colloidal oatmeal', tag: 'avena-sativa-kernel-flour', why: 'A soothing ingredient often used in products for dry, uncomfortable skin.' },
    ],
  },
  {
    value: 'uneven-tone',
    label: 'Uneven tone & dark spots',
    ingredients: [
      { name: 'Vitamin C', tag: 'ascorbic-acid', why: 'An antioxidant that can help brighten the appearance of uneven tone.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Can help improve the appearance of discoloration.' },
      { name: 'Azelaic acid', tag: 'azelaic-acid', why: 'Can help improve the appearance of dark spots and uneven tone.' },
      { name: 'Alpha arbutin', tag: 'alpha-arbutin', why: 'A tone-focused ingredient used to improve the appearance of discoloration.' },
    ],
  },
  {
    value: 'fine-lines',
    label: 'Fine lines & wrinkles',
    ingredients: [
      { name: 'Retinol', tag: 'retinol', why: 'A vitamin A derivative used to improve the appearance of fine lines and texture.' },
      { name: 'Peptides', tag: 'palmitoyl-tripeptide-1', why: 'Skin-conditioning ingredients used in formulas targeting visible signs of aging.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Helps hydrate skin so fine dehydration lines appear less noticeable.' },
      { name: 'Vitamin C', tag: 'ascorbic-acid', why: 'Provides antioxidant support and helps improve the appearance of uneven tone.' },
    ],
  },
  {
    value: 'dehydration',
    label: 'Dehydration',
    ingredients: [
      { name: 'Glycerin', tag: 'glycerin', why: 'A humectant that attracts and holds water in the skin.' },
      { name: 'Hyaluronic acid', tag: 'sodium-hyaluronate', why: 'Helps attract water to improve skin hydration.' },
      { name: 'Panthenol', tag: 'panthenol', why: 'Helps condition skin and support barrier comfort.' },
      { name: 'Sodium PCA', tag: 'sodium-pca', why: 'A natural moisturizing factor component that helps maintain hydration.' },
    ],
  },
  {
    value: 'dullness',
    label: 'Dullness',
    ingredients: [
      { name: 'Vitamin C', tag: 'ascorbic-acid', why: 'An antioxidant used to brighten the appearance of skin.' },
      { name: 'Glycolic acid', tag: 'glycolic-acid', why: 'An exfoliating acid that can help improve surface dullness.' },
      { name: 'Lactic acid', tag: 'lactic-acid', why: 'Helps exfoliate and smooth the skin surface.' },
      { name: 'Niacinamide', tag: 'niacinamide', why: 'Can help improve the appearance of uneven tone.' },
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
] as const;

export function getProfileIngredients(
  skinTypeValue: string,
  sensitive: boolean,
  concernValues: string[]
): Ingredient[] {
  const primary = skinTypes.find((s) => s.value === skinTypeValue);
  if (!primary) return [];

  const combined = [
    ...primary.ingredients,
    ...(sensitive ? sensitiveIngredients : []),
    ...skinConcerns
      .filter((c) => concernValues.includes(c.value))
      .flatMap((c) => c.ingredients),
  ];

  const unique = new Map<string, Ingredient>();

  for (const ingredient of combined) {
    const key = ingredient.tag.toLowerCase();
    if (!unique.has(key)) unique.set(key, ingredient);
  }

  return [...unique.values()];
}