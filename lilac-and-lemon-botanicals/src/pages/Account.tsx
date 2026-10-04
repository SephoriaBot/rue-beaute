import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/react-router';
import { useApi } from '../lib/api';

type ProfileForm = {
  fullName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  cardHolder: string;
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCvc: string;
};

const EMPTY_FORM: ProfileForm = {
  fullName: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  cardHolder: '',
  cardNumber: '',
  cardExpMonth: '',
  cardExpYear: '',
  cardCvc: '',
};

type SavedCard = {
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardHolder: string;
};

type SkinAssessment = {
  baseType: 'Dry' | 'Oily' | 'Combination' | 'Normal';
  sensitive: boolean;
  title: string;
  description: string;
  routine: { title: string; text: string }[];
  notes: string[];
  updatedAt?: string;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price?: number;
  image_url?: string;
  skin_types?: string; // JSON array string
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type TabKey = 'profile' | 'skin';

function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(011|5)/.test(digits)) return 'Discover';
  return digits ? 'Card' : '';
}

function formatCardNumber(digits: string): string {
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

// ---- Skin type guide content ----

const skinTypeGuides: Record <
  SkinAssessment['baseType'],
  {
    likes: string[];
    dislikes: string[];
    ingredientsToUse: string[];
    ingredientsToAvoid: string[];
    funFacts: string[];
  }
> = {
  Dry: {
    likes: ['rich creams', 'facial oils', 'humid environments', 'slow, gentle massage'],
    dislikes: ['hot water', 'foaming cleansers', 'high-percentage acids', 'alcohol-based toners'],
    ingredientsToUse: ['squalane', 'ceramides', 'hyaluronic acid', 'shea butter', 'glycerin'],
    ingredientsToAvoid: ['SLS/sulfates', 'high-alcohol toners', 'clay masks used too often'],
    funFacts: [
      'Dry skin produces less sebum, so it relies more on what you put on it to hold moisture in.',
      'Layering a humectant (like hyaluronic acid) under an oil helps seal moisture in rather than letting it evaporate.',
    ],
  },
  Oily: {
    likes: ['lightweight gels', 'clay', 'niacinamide', 'consistent (not aggressive) cleansing'],
    dislikes: ['heavy occlusive balms', 'over-washing', 'skipping moisturizer'],
    ingredientsToUse: ['niacinamide', 'salicylic acid', 'green tea extract', 'oil-free gels'],
    ingredientsToAvoid: ['coconut oil', 'cocoa butter', 'heavy waxes'],
    funFacts: [
      'Stripping oily skin often backfires — it can trigger even more oil production to compensate.',
      'Oily skin tends to show fewer fine lines over time thanks to the extra natural lipids.',
    ],
  },
  Combination: {
    likes: ['zone-specific routines', 'lightweight hydration', 'balancing (not stripping) cleansers'],
    dislikes: ['one-size-fits-all heavy products', 'harsh astringents'],
    ingredientsToUse: ['niacinamide', 'hyaluronic acid', 'light gel moisturizers'],
    ingredientsToAvoid: ['heavy oils all over the face', 'over-exfoliating the T-zone'],
    funFacts: [
      'Combination skin can shift with seasons — many people run drier in winter and oilier in summer.',
      'It often helps to use two different moisturizer textures on different zones of the face.',
    ],
  },
  Normal: {
    likes: ['maintenance routines', 'gentle actives', 'consistency over intensity'],
    dislikes: ['unnecessary harsh treatments', 'over-complicating the routine'],
    ingredientsToUse: ['antioxidants (vitamin C)', 'gentle retinoids', 'hyaluronic acid'],
    ingredientsToAvoid: ['stacking too many actives at once'],
    funFacts: [
      '"Normal" skin still benefits from SPF and antioxidants — balance now is easiest to maintain, not permanent.',
    ],
  },
};

const sensitiveOverlay = {
  likes: ['fragrance-free formulas', 'patch testing new products', 'simple routines'],
  dislikes: ['fragrance', 'essential oils in high concentration', 'aggressive exfoliation'],
  ingredientsToAvoid: ['fragrance/parfum', 'denatured alcohol', 'high-percentage AHAs/BHAs'],
  funFacts: [
    'Reactive skin can flare from a new product days after first use, not just immediately — patch test for at least 48 hours.',
  ],
};

function getSkinGuide(assessment: SkinAssessment) {
  const base = skinTypeGuides[assessment.baseType];
  if (!assessment.sensitive) return base;
  return {
    likes: [...base.likes, ...sensitiveOverlay.likes],
    dislikes: [...base.dislikes, ...sensitiveOverlay.dislikes],
    ingredientsToUse: base.ingredientsToUse,
    ingredientsToAvoid: [...base.ingredientsToAvoid, ...sensitiveOverlay.ingredientsToAvoid],
    funFacts: [...base.funFacts, ...sensitiveOverlay.funFacts],
  };
}

function getRecommendedProducts(products: Product[], assessment: SkinAssessment): Product[] {
  return products
    .filter((p) => {
      let types: string[] = [];
      try {
        types = JSON.parse(p.skin_types || '[]');
      } catch {
        types = [];
      }
      return types.includes(assessment.baseType) || types.includes('All');
    })
    .sort((a, b) => {
      if (!assessment.sensitive) return 0;
      const aTypes: string[] = JSON.parse(a.skin_types || '[]');
      const bTypes: string[] = JSON.parse(b.skin_types || '[]');
      return (bTypes.includes('Sensitive') ? 1 : 0) - (aTypes.includes('Sensitive') ? 1 : 0);
    });
}

export default function Account() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { apiFetch } = useApi();

  const [tab, setTab] = useState<TabKey>('profile');
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [skinAssessment, setSkinAssessment] = useState<SkinAssessment | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [editingCard, setEditingCard] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isLoaded) return;
      if (!isSignedIn || !user) {
        setLoading(false);
        return;
      }

      try {
        const [accountRes, productsRes] = await Promise.all([
          apiFetch('/api/account'),
          fetch('/api/products'),
        ]);
        if (!accountRes.ok) throw new Error('Failed to load account');
        const data = await accountRes.json();
        const productsData = productsRes.ok ? await productsRes.json() : [];

        if (cancelled) return;

        if (data.profile) {
          setForm((prev) => ({
            ...prev,
            fullName: data.profile.fullName || '',
            email: data.profile.email || user.primaryEmailAddress?.emailAddress || '',
            address: data.profile.address || '',
            city: data.profile.city || '',
            state: data.profile.state || '',
            zip: data.profile.zip || '',
          }));
          if (data.profile.cardLast4) {
            setSavedCard({
              cardBrand: data.profile.cardBrand,
              cardLast4: data.profile.cardLast4,
              cardExpMonth: data.profile.cardExpMonth,
              cardExpYear: data.profile.cardExpYear,
              cardHolder: data.profile.cardHolder,
            });
          }
        } else {
          setForm((prev) => ({
            ...prev,
            fullName: '',
            email: user.primaryEmailAddress?.emailAddress || '',
          }));
        }

        setSkinAssessment(data.skinAssessment || null);
        setProducts(productsData);
      } catch (err) {
        console.error('Could not load account:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, user]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCardNumber(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    update('cardNumber', formatCardNumber(digits));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaveState('saving');

    const digits = form.cardNumber.replace(/\D/g, '');
    const enteringNewCard = digits.length >= 4;

    try {
      const res = await apiFetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          ...(enteringNewCard
            ? {
                cardHolder: form.cardHolder,
                cardBrand: detectCardBrand(digits),
                cardLast4: digits.slice(-4),
                cardExpMonth: form.cardExpMonth,
                cardExpYear: form.cardExpYear,
              }
            : {}),
        }),
      });
      if (!res.ok) throw new Error('Save failed');

      if (enteringNewCard) {
        setSavedCard({
          cardBrand: detectCardBrand(digits),
          cardLast4: digits.slice(-4),
          cardExpMonth: form.cardExpMonth,
          cardExpYear: form.cardExpYear,
          cardHolder: form.cardHolder,
        });
        setEditingCard(false);
        setForm((prev) => ({ ...prev, cardNumber: '', cardCvc: '' }));
      }

      setSaveState('saved');
    } catch (err) {
      console.error('Could not save account:', err);
      setSaveState('error');
    }
  }

  if (!isLoaded || loading) {
    return (
      <main className="page-wrap account-page">
        <div className="wrap account-wrap">
          <p className="account-footnote">Loading your account…</p>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="page-wrap account-page">
        <div className="wrap account-wrap">
          <section className="account-intro">
            <img className="page-icon" src="/icons/gear.png" alt="" aria-hidden="true" />
            <span className="eyebrow">My Account</span>
            <h1>Log in to see your account.</h1>
            <p>Your saved address, payment details, and skin profile all live here once you're signed in.</p>
            <Link className="account-button" to="/login">Log in</Link>
          </section>
        </div>
      </main>
    );
  }

  const guide = skinAssessment ? getSkinGuide(skinAssessment) : null;
  const recommended = skinAssessment ? getRecommendedProducts(products, skinAssessment) : [];

  return (
    <main className="page-wrap account-page">
      <div className="wrap account-wrap">
        <section className="account-intro">
          <img className="page-icon" src="/icons/gear.png" alt="" aria-hidden="true" />
          <span className="eyebrow">My Account</span>
          <h1>{tab === 'profile' ? 'Personal Details' : 'Skin Profile'}</h1>
          <p>
            {tab === 'profile'
              ? "Manage the details Rue Beaute uses to ship your orders."
              : "Your skin assessment, personal guide, and recommendations."}
          </p>
        </section>

        <div className="account-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'profile'}
            className={`account-tab ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => setTab('profile')}
          >
            Profile
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'skin'}
            className={`account-tab ${tab === 'skin' ? 'active' : ''}`}
            onClick={() => setTab('skin')}
          >
            Skin Profile
          </button>
        </div>

        {tab === 'profile' && (
          <form className="account-form" onSubmit={handleSave}>
            <div className="account-card">
              <h2>Your name</h2>
              <div className="account-form-field">
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="account-form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="you@email.com"
                />
              </div>
            </div>

            <div className="account-card">
              <h2>Shipping address</h2>
              <div className="account-form-field">
                <label htmlFor="address">Address</label>
                <input
                  id="address"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className="account-form-row">
                <div className="account-form-field">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                  />
                </div>
                <div className="account-form-field">
                  <label htmlFor="state">State</label>
                  <input
                    id="state"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                  />
                </div>
                <div className="account-form-field">
                  <label htmlFor="zip">ZIP</label>
                  <input
                    id="zip"
                    value={form.zip}
                    onChange={(e) => update('zip', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="account-card">
              <h2>Payment method</h2>
              <p className="account-card-note">
                Rue Beaute hasn't launched checkout yet, so nothing here is charged. We only keep
                your card's brand, last 4 digits, and expiry for your reference — never the full number.
              </p>

              {savedCard && !editingCard ? (
                <div className="account-saved-card">
                  <div className="account-saved-card-info">
                    <span className="account-card-brand">{savedCard.cardBrand}</span>
                    <span>•••• {savedCard.cardLast4}</span>
                    <span className="account-card-exp">Exp {savedCard.cardExpMonth}/{savedCard.cardExpYear}</span>
                  </div>
                  <button type="button" className="account-link-button" onClick={() => setEditingCard(true)}>
                    Replace card
                  </button>
                </div>
              ) : (
                <>
                  <div className="account-form-field">
                    <label htmlFor="cardHolder">Name on card</label>
                    <input
                      id="cardHolder"
                      value={form.cardHolder}
                      onChange={(e) => update('cardHolder', e.target.value)}
                    />
                  </div>
                  <div className="account-form-field">
                    <label htmlFor="cardNumber">Card number</label>
                    <input
                      id="cardNumber"
                      inputMode="numeric"
                      value={form.cardNumber}
                      onChange={(e) => updateCardNumber(e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      autoComplete="cc-number"
                    />
                  </div>
                  <div className="account-form-row">
                    <div className="account-form-field">
                      <label htmlFor="cardExpMonth">Exp month</label>
                      <input
                        id="cardExpMonth"
                        inputMode="numeric"
                        maxLength={2}
                        value={form.cardExpMonth}
                        onChange={(e) => update('cardExpMonth', e.target.value.replace(/\D/g, '').slice(0, 2))}
                        placeholder="MM"
                      />
                    </div>
                    <div className="account-form-field">
                      <label htmlFor="cardExpYear">Exp year</label>
                      <input
                        id="cardExpYear"
                        inputMode="numeric"
                        maxLength={2}
                        value={form.cardExpYear}
                        onChange={(e) => update('cardExpYear', e.target.value.replace(/\D/g, '').slice(0, 2))}
                        placeholder="YY"
                      />
                    </div>
                    <div className="account-form-field">
                      <label htmlFor="cardCvc">CVC</label>
                      <input
                        id="cardCvc"
                        inputMode="numeric"
                        maxLength={4}
                        value={form.cardCvc}
                        onChange={(e) => update('cardCvc', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="•••"
                        autoComplete="cc-csc"
                      />
                    </div>
                  </div>
                  {savedCard && (
                    <button type="button" className="account-link-button" onClick={() => setEditingCard(false)}>
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="account-save-row">
              <button className="account-button" type="submit" disabled={saveState === 'saving'}>
                {saveState === 'saving' ? 'Saving…' : 'Save changes'}
              </button>
              {saveState === 'saved' && <span className="account-saved-note">Saved ✓</span>}
              {saveState === 'error' && <span className="account-saved-note error">Something went wrong — try again.</span>}
            </div>
          </form>
        )}

        {tab === 'skin' && (
          <div className="account-skin-tab">
            {!skinAssessment ? (
              <div className="account-card">
                <h2>Skin type</h2>
                <p className="account-card-note">You haven't taken the skin assessment yet.</p>
                <Link className="account-link-button" to="/my-skin">Take the assessment</Link>
              </div>
            ) : (
              <>
                <div className="account-card">
                  <div className="account-skin-summary">
                    <span className="account-skin-type">{skinAssessment.title}</span>
                    <Link className="account-link-button" to="/my-skin">Retake assessment</Link>
                  </div>
                  <p>{skinAssessment.description}</p>
                  <h3>Your routine</h3>
                  <ol className="account-routine-list">
                    {skinAssessment.routine.map((step) => (
                      <li key={step.title}>
                        <strong>{step.title}:</strong> {step.text}
                      </li>
                    ))}
                  </ol>
                  {skinAssessment.notes.length > 0 && (
                    <ul className="account-notes-list">
                      {skinAssessment.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {guide && (
                  <div className="account-card">
                    <h2>Your Skin Type Guide</h2>
                    <div className="account-guide-grid">
                      <div>
                        <h3>Likes</h3>
                        <ul>{guide.likes.map((i) => <li key={i}>{i}</li>)}</ul>
                      </div>
                      <div>
                        <h3>Dislikes</h3>
                        <ul>{guide.dislikes.map((i) => <li key={i}>{i}</li>)}</ul>
                      </div>
                      <div>
                        <h3>Ingredients to use</h3>
                        <ul>{guide.ingredientsToUse.map((i) => <li key={i}>{i}</li>)}</ul>
                      </div>
                      <div>
                        <h3>Ingredients to avoid</h3>
                        <ul>{guide.ingredientsToAvoid.map((i) => <li key={i}>{i}</li>)}</ul>
                      </div>
                    </div>
                    <h3>Good to know</h3>
                    <ul>{guide.funFacts.map((i) => <li key={i}>{i}</li>)}</ul>
                  </div>
                )}

                <div className="account-card">
                  <h2>Recommended For You</h2>
                  {recommended.length === 0 ? (
                    <p className="account-card-note">
                      No matching products yet — check back soon.
                    </p>
                  ) : (
                    <div className="account-recommend-grid">
                      {recommended.map((p) => (
                        <Link key={p.id} to={`/products/${p.slug}`} className="account-recommend-card">
                          {p.image_url && <img src={p.image_url} alt={p.name} />}
                          <span>{p.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}