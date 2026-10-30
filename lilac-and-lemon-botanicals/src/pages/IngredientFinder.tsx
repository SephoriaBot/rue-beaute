import { useState } from 'react';
import { useAuth } from '@clerk/react-router';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/api';
import { skinTypes } from '../lib/skinIngredients';
import './ingredient-finder.css';

type Product = {
  name: string;
  brand: string;
  url: string;
  imageUrl: string | null;
  source: 'database' | 'web';
  matches: string[];
};

type SearchState = {
  loading: boolean;
  error: string | null;
  products: Product[] | null;
  total: number;
};

export default function IngredientFinder() {
  const [selected, setSelected] = useState<string | null>(null);
  const [searches, setSearches] = useState<Record<string, SearchState>>({});
  const { isSignedIn } = useAuth();
  const { apiFetch } = useApi();

  const current = skinTypes.find((s) => s.value === selected) ?? null;
  const search = current ? searches[current.value] : undefined;

  async function findProducts(skinType: string) {
    setSearches((prev) => ({
      ...prev,
      [skinType]: { loading: true, error: null, products: null, total: 0 },
    }));
    try {
      const res = await apiFetch('/api/product-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Search failed. Please try again.');
      setSearches((prev) => ({
        ...prev,
        [skinType]: { loading: false, error: null, products: data.products ?? [], total: data.total ?? 0 },
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Search failed. Please try again.';
      setSearches((prev) => ({
        ...prev,
        [skinType]: { loading: false, error: message, products: null, total: 0 },
      }));
    }
  }

  return (
    <main className="ingredient-page">
      <div className="wrap ingredient-wrap">
        <div className="ingredient-intro">
          <h1>Ingredient Finder</h1>
          <p>Pick your skin type to see ingredients that tend to work well for it, then find products that contain them.</p>
        </div>

        <div className="ingredient-types" role="group" aria-label="Skin type">
          {skinTypes.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`ingredient-chip${selected === s.value ? ' active' : ''}`}
              aria-pressed={selected === s.value}
              onClick={() => setSelected(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {current && (
          <section className="ingredient-results">
            <p className="ingredient-blurb">{current.blurb}</p>
            <ul className="ingredient-list">
              {current.ingredients.map((i) => (
                <li key={i.name} className="ingredient-card">
                  <h3>{i.name}</h3>
                  <p>{i.why}</p>
                </li>
              ))}
            </ul>

            <div className="ingredient-search">
              {isSignedIn ? (
                <button
                  type="button"
                  className="ingredient-find"
                  disabled={search?.loading}
                  onClick={() => findProducts(current.value)}
                >
                  {search?.loading ? 'Searching…' : `Find products for ${current.label.toLowerCase()} skin`}
                </button>
              ) : (
                <p className="ingredient-login">
                  <Link to="/login">Log in</Link> to search for products.
                </p>
              )}

              {search?.loading && (
                <p className="ingredient-note">This can take up to a minute while we search.</p>
              )}

              {search?.error && <p className="ingredient-error">{search.error}</p>}

              {search?.products && (
                <>
                  {search.products.length === 0 && <p className="ingredient-note">No products found.</p>}
                  <ul className="product-results">
                    {search.products.map((p) => (
                      <li key={`${p.brand}|${p.name}|${p.url}`}>
                        {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" />}
                        <div>
                          <a href={p.url} target="_blank" rel="noopener noreferrer">
                            {p.brand ? `${p.brand} — ` : ''}
                            {p.name}
                          </a>
                          <span className="product-match">
                            {p.matches.length} of {search.total}: {p.matches.join(', ')}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
