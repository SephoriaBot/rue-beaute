
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/react-router';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/api';
import {
  skinTypes,
  skinConcerns,
  productCategories,
  getProfileIngredients,
} from '../lib/skinIngredients';
import {
  checkProduct,
  verdictRank,
  type CheckProduct,
  type CheckResult,
} from '../lib/ingredientCheck';
import './ingredient-finder.css';
import './ingredient-check.css';

type Product = CheckProduct & {
  url: string;
  source: 'database' | 'web';
  matches: string[];
  category: string;
  score: number;
  reason: string;
  verdict: CheckResult['verdict'];
  label: string;
  flags: string[];
};

type SearchState = {
  loading: boolean;
  error: string | null;
  products: Product[] | null;
  total: number;
  profileKey: string;
};

type Tab = 'matches' | 'brands' | 'mine';

type Lookup = {
  loading: boolean;
  error: string | null;
  query: string;
  items: CheckProduct[] | null;
  skipped: number;
};

const BRANDS_KEY = 'rue-fav-brands';
const SHELF_KEY = 'rue-my-products';

function loadList<T>(
  key: string,
  clean: (value: unknown) => T | null
): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(clean).filter((item): item is T => item !== null);
  } catch {
    return [];
  }
}

function saveList(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked; the page still works without saving.
  }
}

function cleanBrand(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 80)
    : null;
}

function cleanShelfItem(value: unknown): CheckProduct | null {
  if (!value || typeof value !== 'object') return null;

  const v = value as Record<string, unknown>;

  if (typeof v.name !== 'string' || typeof v.brand !== 'string') {
    return null;
  }

  return {
    name: v.name.slice(0, 150),
    brand: v.brand.slice(0, 100),
    imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl : null,
    tags: Array.isArray(v.tags)
      ? v.tags
          .filter((t): t is string => typeof t === 'string')
          .slice(0, 200)
      : [],
    text: typeof v.text === 'string' ? v.text.slice(0, 1500) : '',
  };
}

function itemKey(product: CheckProduct): string {
  return `${product.brand}|${product.name}`.toLowerCase();
}

function useLookup(mode: 'brand' | 'product') {
  const { apiFetch } = useApi();
  const [state, setState] = useState<Lookup | null>(null);

  async function run(query: string) {
    const q = query.trim();
    if (q.length < 2) return;

    setState({
      loading: true,
      error: null,
      query: q,
      items: null,
      skipped: 0,
    });

    try {
      const response = await apiFetch('/api/product-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, query: q }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Lookup failed. Please try again.');
      }

      setState({
        loading: false,
        error: null,
        query: q,
        items: data.products ?? [],
        skipped: data.skipped ?? 0,
      });
    } catch (error) {
      setState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Lookup failed. Please try again.',
        query: q,
        items: null,
        skipped: 0,
      });
    }
  }

  return { state, run };
}

function CheckCard({
  product,
  result,
  actionLabel,
  onAction,
  actionDisabled,
}: {
  product: CheckProduct;
  result: CheckResult;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <li className="check-card">
      <div className="check-card-main">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="product-placeholder">
            <span>RB</span>
          </div>
        )}

        <div className="check-card-info">
          <strong>
            {product.brand} — {product.name}
          </strong>

          <span className={`check-badge check-${result.verdict}`}>
            {result.label}
          </span>

          <span className="check-note">
            Ingredient match: {result.score}%
          </span>

          {result.hits.length > 0 && (
            <span className="check-hits">
              Profile matches: {result.hits.slice(0, 5).map((h) => h.name).join(', ')}
              {result.hits.length > 5
                ? ` +${result.hits.length - 5} more`
                : ''}
            </span>
          )}

          {result.flags.length > 0 && (
            <span className="check-note">
              Potential sensitivities: {result.flags.join(', ')}
            </span>
          )}

          {result.note && (
            <span className="check-note">{result.note}</span>
          )}
        </div>

        <button
          type="button"
          className="check-action"
          disabled={actionDisabled}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      </div>

      {product.text && (
        <details className="check-details">
          <summary>Full ingredient list</summary>
          <p>{product.text}</p>
        </details>
      )}
    </li>
  );
}

export default function IngredientFinder() {
  const [selected, setSelected] = useState<string | null>(null);
  const [sensitive, setSensitive] = useState(false);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState<SearchState | null>(null);
  const [openTag, setOpenTag] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('matches');
  const [brandInput, setBrandInput] = useState('');
  const [productInput, setProductInput] = useState('');
  const [showAllBrand, setShowAllBrand] = useState(false);

  const [favBrands, setFavBrands] = useState<string[]>(() =>
    loadList(BRANDS_KEY, cleanBrand)
  );

  const [shelf, setShelf] = useState<CheckProduct[]>(() =>
    loadList(SHELF_KEY, cleanShelfItem)
  );

  const [shelfError, setShelfError] = useState<string | null>(null);
  const loadedFor = useRef(false);

  const [manualName, setManualName] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualText, setManualText] = useState('');

  const brandLookup = useLookup('brand');
  const productLookup = useLookup('product');

  const { isSignedIn, isLoaded } = useAuth();
  const { apiFetch } = useApi();

  // Signed in: the shelf and brands live on the account (Turso).
  // Anything already saved on this device is merged in once, then cleared.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      return;
    }
    if (loadedFor.current) return;
    loadedFor.current = true;

    let cancelled = false;

    (async () => {
      try {
        const response = await apiFetch('/api/shelf');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not load');
        if (cancelled) return;

        const serverBrands: string[] = Array.isArray(data.brands)
          ? data.brands
          : [];
        const serverShelf: CheckProduct[] = Array.isArray(data.products)
          ? data.products
          : [];

        const localBrands = loadList(BRANDS_KEY, cleanBrand);
        const localShelf = loadList(SHELF_KEY, cleanShelfItem);

        const mergedBrands = [...serverBrands];
        for (const b of [...localBrands, ...favBrands]) {
          if (!mergedBrands.some((x) => x.toLowerCase() === b.toLowerCase())) {
            mergedBrands.push(b);
          }
        }

        const mergedShelf = [...serverShelf];
        for (const p of [...localShelf, ...shelf]) {
          if (!mergedShelf.some((x) => itemKey(x) === itemKey(p))) {
            mergedShelf.push(p);
          }
        }

        const brands = mergedBrands.slice(0, 30);
        const products = mergedShelf.slice(0, 50);

        setFavBrands(brands);
        setShelf(products);

        const changed =
          brands.length !== serverBrands.length ||
          products.length !== serverShelf.length;

        if (changed) {
          const save = await apiFetch('/api/shelf', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brands, products }),
          });
          if (!save.ok) throw new Error('Could not save');
        }

        try {
          localStorage.removeItem(BRANDS_KEY);
          localStorage.removeItem(SHELF_KEY);
        } catch {
          // ignore
        }
      } catch {
        if (!cancelled) {
          loadedFor.current = false;
          setShelfError('Could not load your saved products. Please refresh.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  async function persist(brands: string[], products: CheckProduct[]) {
    if (!isSignedIn) {
      saveList(BRANDS_KEY, brands);
      saveList(SHELF_KEY, products);
      return;
    }

    try {
      const response = await apiFetch('/api/shelf', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brands, products }),
      });
      if (!response.ok) throw new Error('save failed');
      setShelfError(null);
    } catch {
      setShelfError('Could not save to your account. Please try again.');
    }
  }

  const current = skinTypes.find((type) => type.value === selected) ?? null;

  const profileKey = JSON.stringify({
    skinType: selected,
    sensitive,
    concerns: [...concerns].sort(),
    category,
  });

  const visibleSearch = search?.profileKey === profileKey ? search : null;

  const ingredients = current
    ? getProfileIngredients(selected!, sensitive, concerns)
    : [];

  const openIngredient =
    ingredients.find((ingredient) => ingredient.tag === openTag) ?? null;

  function score(product: CheckProduct): CheckResult {
    return checkProduct(product, selected ?? '', sensitive, concerns);
  }

  function toggleExpanded(categoryName: string) {
    setExpanded((previous) =>
      previous.includes(categoryName)
        ? previous.filter((item) => item !== categoryName)
        : [...previous, categoryName]
    );
  }

  function toggleConcern(value: string) {
    setConcerns((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value]
    );
  }

  function saveBrand(name: string) {
    const clean = name.trim();
    if (!clean) return;

    if (favBrands.some((b) => b.toLowerCase() === clean.toLowerCase())) {
      return;
    }

    const next = [...favBrands, clean].slice(0, 30);
    setFavBrands(next);
    void persist(next, shelf);
  }

  function removeBrand(name: string) {
    const next = favBrands.filter((b) => b !== name);
    setFavBrands(next);
    void persist(next, shelf);
  }

  function addToShelf(product: CheckProduct) {
    if (shelf.some((item) => itemKey(item) === itemKey(product))) return;

    const next = [...shelf, product].slice(0, 50);
    setShelf(next);
    void persist(favBrands, next);
  }

  function removeFromShelf(product: CheckProduct) {
    const next = shelf.filter((item) => itemKey(item) !== itemKey(product));
    setShelf(next);
    void persist(favBrands, next);
  }

  function addManual() {
    const name = manualName.trim();
    const text = manualText.trim();

    if (!name || !text) return;

    addToShelf({
      name: name.slice(0, 150),
      brand: manualBrand.trim().slice(0, 100) || 'My product',
      imageUrl: null,
      tags: [],
      text: text.slice(0, 1500),
    });

    setManualName('');
    setManualBrand('');
    setManualText('');
  }

  function runBrand(name: string) {
    setBrandInput(name);
    setShowAllBrand(false);
    brandLookup.run(name);
  }

  async function findProducts() {
    if (!selected) return;

    setSearch({
      loading: true,
      error: null,
      products: null,
      total: 0,
      profileKey,
    });

    try {
      const response = await apiFetch('/api/product-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skinType: selected,
          sensitive,
          concerns,
          category,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Search failed (HTTP ${response.status}). Please try again.`
        );
      }

      setSearch({
        loading: false,
        error: null,
        products: data.products ?? [],
        total: data.total ?? 0,
        profileKey,
      });
    } catch (error) {
      setSearch({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Search failed. Please try again.',
        products: null,
        total: 0,
        profileKey,
      });
    }
  }

  const brandScored = (brandLookup.state?.items ?? [])
    .map((product) => ({ product, result: score(product) }))
    .sort(
      (a, b) =>
        verdictRank[b.result.verdict] - verdictRank[a.result.verdict] ||
        b.result.score - a.result.score
    );

  const brandShown = showAllBrand ? brandScored : brandScored.slice(0, 12);

  const brandSaved =
    !!brandLookup.state &&
    favBrands.some(
      (b) => b.toLowerCase() === brandLookup.state!.query.toLowerCase()
    );

  const signInNote = (
    <p className="ingredient-login">
      <Link to="/login">Log in</Link> to look up products.
    </p>
  );

  return (
    <main className="ingredient-page">
      <div className="wrap ingredient-wrap">
        <header className="ingredient-intro">
          <p className="ingredient-eyebrow">PERSONALIZED SKINCARE RESEARCH</p>
          <h1>Ingredient Finder</h1>
          <p>
            Build your skin profile, then find products, browse brands you
            like, or check what you already own.
          </p>
        </header>

        <section className="ingredient-section">
          <div className="ingredient-section-heading">
            <span className="ingredient-step">01</span>
            <div>
              <h2>Choose your skin type</h2>
              <p>Select the skin type that best describes your skin.</p>
            </div>
          </div>

          <div className="ingredient-types" role="group" aria-label="Skin type">
            {skinTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`ingredient-chip${selected === type.value ? ' active' : ''}`}
                aria-pressed={selected === type.value}
                onClick={() => setSelected(type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </section>

        <section className="ingredient-section">
          <div className="ingredient-section-heading">
            <span className="ingredient-step">02</span>
            <div>
              <h2>Skin sensitivity</h2>
              <p>Sensitivity can be present with any skin type.</p>
            </div>
          </div>

          <label className="ingredient-sensitive-option">
            <input
              type="checkbox"
              checked={sensitive}
              onChange={(event) => setSensitive(event.target.checked)}
            />
            <span>
              <strong>My skin is sensitive</strong>
              <small>
                Include ingredients commonly used to support a sensitive skin
                barrier.
              </small>
            </span>
          </label>
        </section>

        <section className="ingredient-section">
          <div className="ingredient-section-heading">
            <span className="ingredient-step">03</span>
            <div>
              <h2>Skin concerns</h2>
              <p>Choose any concerns you'd like your routine to address.</p>
            </div>
          </div>

          <div className="ingredient-concerns">
            {skinConcerns.map((concern) => {
              const active = concerns.includes(concern.value);

              return (
                <button
                  key={concern.value}
                  type="button"
                  className={`ingredient-concern${active ? ' active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleConcern(concern.value)}
                >
                  <span className="ingredient-concern-check">
                    {active ? '✓' : '+'}
                  </span>
                  {concern.label}
                </button>
              );
            })}
          </div>
        </section>

        {current && (
          <div
            className="check-tabs"
            role="tablist"
            aria-label="What would you like to do?"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'matches'}
              className={`check-tab${tab === 'matches' ? ' active' : ''}`}
              onClick={() => setTab('matches')}
            >
              Find products
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === 'brands'}
              className={`check-tab${tab === 'brands' ? ' active' : ''}`}
              onClick={() => setTab('brands')}
            >
              Browse a brand
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === 'mine'}
              className={`check-tab${tab === 'mine' ? ' active' : ''}`}
              onClick={() => setTab('mine')}
            >
              My products{shelf.length > 0 ? ` (${shelf.length})` : ''}
            </button>
          </div>
        )}

        {current && tab === 'matches' && (
          <section className="ingredient-profile">
            <div className="ingredient-section-heading">
              <span className="ingredient-step">04</span>
              <div>
                <h2>Your ingredient profile</h2>
                <p>{current.blurb}</p>
              </div>
            </div>

            <div className="ingredient-list" role="group" aria-label="Ingredients">
              {ingredients.map((ingredient) => (
                <button
                  key={ingredient.tag}
                  type="button"
                  className={`ingredient-tag${openTag === ingredient.tag ? ' active' : ''}`}
                  aria-pressed={openTag === ingredient.tag}
                  onClick={() =>
                    setOpenTag(openTag === ingredient.tag ? null : ingredient.tag)
                  }
                >
                  {ingredient.name}
                </button>
              ))}
            </div>

            <p className="ingredient-why" aria-live="polite">
              {openIngredient
                ? `${openIngredient.name}: ${openIngredient.why}`
                : `${ingredients.length} ingredients — tap one to see why it helps.`}
            </p>

            <div className="ingredient-search">
              <div className="ingredient-section-heading">
                <div>
                  <h2>What kind of product are you looking for?</h2>
                  <p>Choose a category to narrow your product search.</p>
                </div>
              </div>

              <div
                className="ingredient-types"
                role="group"
                aria-label="Product category"
              >
                <button
                  type="button"
                  className={`ingredient-chip${category === 'All' ? ' active' : ''}`}
                  aria-pressed={category === 'All'}
                  onClick={() => setCategory('All')}
                >
                  All
                </button>

                {productCategories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`ingredient-chip${category === item ? ' active' : ''}`}
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {isSignedIn ? (
                <button
                  type="button"
                  className="ingredient-find"
                  disabled={visibleSearch?.loading}
                  onClick={findProducts}
                >
                  {visibleSearch?.loading
                    ? 'Searching for products…'
                    : category === 'All'
                      ? 'Find matching products'
                      : `Find ${category}`}
                </button>
              ) : (
                signInNote
              )}

              {visibleSearch?.loading && (
                <p className="ingredient-note">
                  Searching product listings. This may take up to a minute.
                </p>
              )}

              {visibleSearch?.error && (
                <p className="ingredient-error">{visibleSearch.error}</p>
              )}

              {visibleSearch?.products && (
                <div className="ingredient-product-area">
                  <div className="ingredient-product-heading">
                    <h2>
                      {category === 'All' ? 'Product matches' : category}
                    </h2>
                    <p>
                      Products are scored with the same personalized ingredient
                      checker used in Brand Search and My Products. Links open
                      a shopping search.
                    </p>
                  </div>

                  {visibleSearch.products.length === 0 ? (
                    <p className="ingredient-note">
                      No matching products were found in this category. Try
                      another category or remove a concern.
                    </p>
                  ) : (
                    productCategories.map((categoryName) => {
                      const products = visibleSearch.products!.filter(
                        (product) => product.category === categoryName
                      );

                      if (products.length === 0) return null;

                      const isOpen = expanded.includes(categoryName);
                      const shown = isOpen ? products : products.slice(0, 5);

                      return (
                        <section
                          className="ingredient-category"
                          key={categoryName}
                        >
                          <div className="ingredient-category-heading">
                            <h3>{categoryName}</h3>
                            <span>{products.length}</span>
                          </div>

                          <ul className="product-results">
                            {shown.map((product, index) => {
                              const alreadySaved = shelf.some(
                                (item) => itemKey(item) === itemKey(product)
                              );

                              return (
                                <li
                                  key={`${product.brand}|${product.name}|${product.url}|${index}`}
                                  className="product-result"
                                >
                                  {product.imageUrl ? (
                                    <img
                                      src={product.imageUrl}
                                      alt=""
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="product-placeholder">
                                      <span>RB</span>
                                    </div>
                                  )}

                                  <div className="product-result-info">
                                    <a
                                      href={product.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {product.brand ? `${product.brand} — ` : ''}
                                      {product.name} ↗
                                    </a>

                                    <span className="product-match">
                                      {product.matches.slice(0, 4).join(', ')}
                                      {product.matches.length > 4
                                        ? ` +${product.matches.length - 4} more`
                                        : ''}
                                    </span>
                                  </div>

                                  <div className="product-score">
                                    <strong>{product.label}</strong>
                                    <small>{product.score}% ingredient match</small>
                                    <button
                                      type="button"
                                      className="check-action"
                                      disabled={alreadySaved}
                                      onClick={() => addToShelf(product)}
                                    >
                                      {alreadySaved ? 'On my shelf' : '+ My shelf'}
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>

                          {products.length > 5 && (
                            <button
                              type="button"
                              className="ingredient-more"
                              onClick={() => toggleExpanded(categoryName)}
                            >
                              {isOpen
                                ? 'Show fewer'
                                : `Show ${products.length - 5} more`}
                            </button>
                          )}
                        </section>
                      );
                    })
                  )}

                  <p className="ingredient-disclaimer">
                    Ingredient matches are based on available product listings.
                    Formulas can change, and ingredient presence alone does not
                    guarantee suitability. Check the current packaging and
                    full ingredient list before purchasing.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {current && tab === 'brands' && (
          <section className="check-panel">
            <div className="ingredient-product-heading">
              <h2>Browse a brand</h2>
              <p>
                Pick a brand you like and see which of its products fit your
                skin profile.
              </p>
            </div>

            {!isSignedIn ? (
              signInNote
            ) : (
              <>
                <form
                  className="check-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    runBrand(brandInput);
                  }}
                >
                  <input
                    type="text"
                    value={brandInput}
                    maxLength={80}
                    placeholder="e.g. CeraVe, The Ordinary, La Roche-Posay"
                    onChange={(event) => setBrandInput(event.target.value)}
                    aria-label="Brand name"
                  />

                  <button
                    type="submit"
                    className="ingredient-find"
                    disabled={
                      brandLookup.state?.loading || brandInput.trim().length < 2
                    }
                  >
                    {brandLookup.state?.loading ? 'Looking up…' : 'Look up brand'}
                  </button>
                </form>

                {favBrands.length > 0 && (
                  <div className="check-favs">
                    <small>Your brands</small>
                    <div>
                      {favBrands.map((brand) => (
                        <span className="check-fav" key={brand}>
                          <button type="button" onClick={() => runBrand(brand)}>
                            {brand}
                          </button>

                          <button
                            type="button"
                            className="check-fav-x"
                            aria-label={`Remove ${brand}`}
                            onClick={() => removeBrand(brand)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {brandLookup.state?.error && (
                  <p className="ingredient-error">{brandLookup.state.error}</p>
                )}

                {brandLookup.state?.items && (
                  <div className="check-results">
                    <div className="check-results-head">
                      <h3>
                        {brandScored.length} product
                        {brandScored.length === 1 ? '' : 's'} from{' '}
                        {brandLookup.state.query}
                      </h3>

                      {!brandSaved && brandScored.length > 0 && (
                        <button
                          type="button"
                          className="ingredient-more"
                          onClick={() => saveBrand(brandLookup.state!.query)}
                        >
                          ☆ Save this brand
                        </button>
                      )}
                    </div>

                    {brandScored.length === 0 ? (
                      <p className="ingredient-note">
                        No products with ingredient lists were found for that
                        brand. Check the spelling, or try the My products tab to
                        paste an ingredient list yourself.
                      </p>
                    ) : (
                      <ul className="check-list">
                        {brandShown.map(({ product, result }) => (
                          <CheckCard
                            key={itemKey(product)}
                            product={product}
                            result={result}
                            actionLabel={
                              shelf.some(
                                (s) => itemKey(s) === itemKey(product)
                              )
                                ? 'On my shelf'
                                : '+ My shelf'
                            }
                            actionDisabled={shelf.some(
                              (s) => itemKey(s) === itemKey(product)
                            )}
                            onAction={() => addToShelf(product)}
                          />
                        ))}
                      </ul>
                    )}

                    {brandScored.length > 12 && (
                      <button
                        type="button"
                        className="ingredient-more"
                        onClick={() => setShowAllBrand(!showAllBrand)}
                      >
                        {showAllBrand
                          ? 'Show fewer'
                          : `Show ${brandScored.length - 12} more`}
                      </button>
                    )}

                    {brandLookup.state.skipped > 0 && (
                      <p className="ingredient-note">
                        {brandLookup.state.skipped} listing
                        {brandLookup.state.skipped === 1 ? ' was' : 's were'}{' '}
                        left out because no ingredient list was available.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <p className="ingredient-disclaimer">
              Fit is based on which helpful ingredients appear on the list, not
              how much of each is in the formula. Listings come from a
              community database and can be out of date, so check the current
              packaging.
            </p>
          </section>
        )}

        {current && tab === 'mine' && (
          <section className="check-panel">
            <div className="ingredient-product-heading">
              <h2>My products</h2>
              <p>
                Add what you already use to see how each one fits your current
                profile.{' '}
                {isSignedIn
                  ? 'Your shelf is saved to your account.'
                  : 'Sign in to save your shelf to your account.'}
              </p>
              {shelfError && <p role="alert">{shelfError}</p>}
            </div>

            {shelf.length === 0 ? (
              <p className="ingredient-note check-center">
                Nothing on your shelf yet. Search below or paste an ingredient
                list.
              </p>
            ) : (
              <ul className="check-list">
                {shelf.map((product) => (
                  <CheckCard
                    key={itemKey(product)}
                    product={product}
                    result={score(product)}
                    actionLabel="Remove"
                    onAction={() => removeFromShelf(product)}
                  />
                ))}
              </ul>
            )}

            <div className="check-add">
              <h3>Add a product</h3>

              {!isSignedIn ? (
                signInNote
              ) : (
                <>
                  <form
                    className="check-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      productLookup.run(productInput);
                    }}
                  >
                    <input
                      type="text"
                      value={productInput}
                      maxLength={80}
                      placeholder="Brand and product, e.g. CeraVe moisturizing cream"
                      onChange={(event) => setProductInput(event.target.value)}
                      aria-label="Product name"
                    />

                    <button
                      type="submit"
                      className="ingredient-find"
                      disabled={
                        productLookup.state?.loading ||
                        productInput.trim().length < 2
                      }
                    >
                      {productLookup.state?.loading ? 'Searching…' : 'Search'}
                    </button>
                  </form>

                  {productLookup.state?.error && (
                    <p className="ingredient-error">
                      {productLookup.state.error}
                    </p>
                  )}

                  {productLookup.state?.items &&
                    (productLookup.state.items.length === 0 ? (
                      <p className="ingredient-note">
                        No products found. Try fewer words, or paste the
                        ingredient list below.
                      </p>
                    ) : (
                      <ul className="check-list">
                        {productLookup.state.items.map((product) => (
                          <CheckCard
                            key={itemKey(product)}
                            product={product}
                            result={score(product)}
                            actionLabel={
                              shelf.some(
                                (s) => itemKey(s) === itemKey(product)
                              )
                                ? 'On my shelf'
                                : '+ My shelf'
                            }
                            actionDisabled={shelf.some(
                              (s) => itemKey(s) === itemKey(product)
                            )}
                            onAction={() => addToShelf(product)}
                          />
                        ))}
                      </ul>
                    ))}
                </>
              )}

              <details className="check-manual">
                <summary>Can't find it? Paste the ingredient list</summary>

                <input
                  type="text"
                  value={manualBrand}
                  maxLength={100}
                  placeholder="Brand"
                  onChange={(event) => setManualBrand(event.target.value)}
                  aria-label="Brand"
                />

                <input
                  type="text"
                  value={manualName}
                  maxLength={150}
                  placeholder="Product name"
                  onChange={(event) => setManualName(event.target.value)}
                  aria-label="Product name"
                />

                <textarea
                  value={manualText}
                  maxLength={1500}
                  rows={5}
                  placeholder="Paste the ingredients from the back of the package, separated by commas"
                  onChange={(event) => setManualText(event.target.value)}
                  aria-label="Ingredient list"
                />

                <button
                  type="button"
                  className="ingredient-find"
                  disabled={!manualName.trim() || !manualText.trim()}
                  onClick={addManual}
                >
                  Add to my shelf
                </button>
              </details>
            </div>

            <p className="ingredient-disclaimer">
              Fit is based on which helpful ingredients appear on the list, not
              how much of each is in the formula. A weak fit doesn't mean a
              product is bad, only that it has little of what your profile
              looks for.
            </p>
          </section>
        )}

        {!current && (
          <p className="ingredient-empty">
            Select a skin type above to start building your ingredient profile.
          </p>
        )}
      </div>
    </main>
  );
}
