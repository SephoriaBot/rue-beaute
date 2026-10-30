import { useState } from 'react';
import { useAuth } from '@clerk/react-router';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/api';
import {
  skinTypes,
  skinConcerns,
  productCategories,
  getProfileIngredients,
} from '../lib/skinIngredients';
import './ingredient-finder.css';

type Product = {
  name: string;
  brand: string;
  url: string;
  imageUrl: string | null;
  source: 'database' | 'web';
  matches: string[];
  category: string;
  score: number;
  reason: string;
};

type SearchState = {
  loading: boolean;
  error: string | null;
  products: Product[] | null;
  total: number;
  profileKey: string;
};

export default function IngredientFinder() {
  const [selected, setSelected] = useState<string | null>(null);
  const [sensitive, setSensitive] = useState(false);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [search, setSearch] = useState<SearchState | null>(null);

  const { isSignedIn } = useAuth();
  const { apiFetch } = useApi();

  const current = skinTypes.find((type) => type.value === selected) ?? null;

  const profileKey = JSON.stringify({
    skinType: selected,
    sensitive,
    concerns: [...concerns].sort(),
  });

  const visibleSearch =
    search?.profileKey === profileKey ? search : null;

  const ingredients = current
    ? getProfileIngredients(selected!, sensitive, concerns)
    : [];

  function toggleConcern(value: string) {
    setConcerns((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value]
    );
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
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Search failed. Please try again.');
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

  return (
    <main className="ingredient-page">
      <div className="wrap ingredient-wrap">
        <header className="ingredient-intro">
          <p className="ingredient-eyebrow">PERSONALIZED SKINCARE RESEARCH</p>
          <h1>Ingredient Finder</h1>
          <p>
            Build your skin profile to discover ingredients and skincare
            products that may suit your needs.
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
              <p>
                Sensitivity can be present with any skin type.
              </p>
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
              <p>
                Choose any concerns you'd like your routine to address.
              </p>
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
          <section className="ingredient-profile">
            <div className="ingredient-section-heading">
              <span className="ingredient-step">04</span>
              <div>
                <h2>Your ingredient profile</h2>
                <p>{current.blurb}</p>
              </div>
            </div>

            <div className="ingredient-list">
              {ingredients.map((ingredient) => (
                <article className="ingredient-card" key={ingredient.tag}>
                  <h3>{ingredient.name}</h3>
                  <p>{ingredient.why}</p>
                </article>
              ))}
            </div>

            <div className="ingredient-search">
              {isSignedIn ? (
                <button
                  type="button"
                  className="ingredient-find"
                  disabled={visibleSearch?.loading}
                  onClick={findProducts}
                >
                  {visibleSearch?.loading
                    ? 'Searching for products…'
                    : 'Find matching products'}
                </button>
              ) : (
                <p className="ingredient-login">
                  <Link to="/login">Log in</Link> to search for products.
                </p>
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
                    <h2>Product matches</h2>
                    <p>
                      Ranked by the number of selected ingredients found in
                      each product listing.
                    </p>
                  </div>

                  {visibleSearch.products.length === 0 ? (
                    <p className="ingredient-note">
                      No matching products were found. Try removing a concern
                      or searching again later.
                    </p>
                  ) : (
                    productCategories.map((category) => {
                      const products = visibleSearch.products!.filter(
                        (product) => product.category === category
                      );

                      if (products.length === 0) return null;

                      return (
                        <section
                          className="ingredient-category"
                          key={category}
                        >
                          <div className="ingredient-category-heading">
                            <h3>{category}</h3>
                            <span>{products.length}</span>
                          </div>

                          <ul className="product-results">
                            {products.map((product, index) => (
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
                                    {product.brand
                                      ? `${product.brand} — `
                                      : ''}
                                    {product.name}
                                  </a>

                                  <span className="product-reason">
                                    {product.reason}
                                  </span>

                                  <span className="product-match">
                                    Matches: {product.matches.join(', ')}
                                  </span>

                                  <span className="product-source">
                                    {product.source === 'database'
                                      ? 'Open Beauty Facts'
                                      : 'Web search'}
                                  </span>
                                </div>

                                <div className="product-score">
                                  <strong>{product.score}%</strong>
                                  <small>ingredient match</small>
                                </div>
                              </li>
                            ))}
                          </ul>
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

        {!current && (
          <p className="ingredient-empty">
            Select a skin type above to start building your ingredient profile.
          </p>
        )}
      </div>
    </main>
  );
}