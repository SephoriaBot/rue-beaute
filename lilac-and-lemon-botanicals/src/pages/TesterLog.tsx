import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react-router';
import { useApi } from '../lib/api';

type Feel = 'dry_tight' | 'comfortable' | 'oily';

type Checkin = {
  after_use_feel: Feel;
  daytime_feel: Feel;
  hydration: number;
  breakouts: number;
  sensitivity: number;
  notes: string | null;
};

const feels: { value: Feel; label: string }[] = [
  { value: 'dry_tight', label: 'Dry / tight' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'oily', label: 'Oily' },
];

function Scale({ label, value, onChange, helper }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helper: string;
}) {
  return (
    <fieldset className="tester-scale">
      <legend>{label}</legend>
      <p>{helper}</p>
      <div className="tester-scale-options">
        {[1, 2, 3, 4, 5].map((number) => (
          <button
            key={number}
            type="button"
            className={value === number ? 'tester-score active' : 'tester-score'}
            onClick={() => onChange(number)}
            aria-pressed={value === number}
          >
            {number}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function TesterLog() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { apiFetch } = useApi();
  const userId = user?.id ?? '';

  const [weekNumber, setWeekNumber] = useState(1);
  const [afterUseFeel, setAfterUseFeel] = useState<Feel | ''>('');
  const [daytimeFeel, setDaytimeFeel] = useState<Feel | ''>('');
  const [hydration, setHydration] = useState(0);
  const [breakouts, setBreakouts] = useState(0);
  const [sensitivity, setSensitivity] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    apiFetch('/api/tester/checkin')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load your check-in.');
        return data;
      })
      .then((data) => {
        setWeekNumber(data.weekNumber ?? 1);
        if (data.checkin) {
          setAfterUseFeel(data.checkin.after_use_feel);
          setDaytimeFeel(data.checkin.daytime_feel);
          setHydration(data.checkin.hydration);
          setBreakouts(data.checkin.breakouts);
          setSensitivity(data.checkin.sensitivity);
          setNotes(data.checkin.notes ?? '');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!isLoaded) return null;
if (!isSignedIn) return <Navigate to="/login" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaved(false);

    if (!afterUseFeel || !daytimeFeel || !hydration || !breakouts || !sensitivity) {
      setError('Please complete every rating before saving.');
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch('/api/tester/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  afterUseFeel,
  daytimeFeel,
  hydration,
  breakouts,
  sensitivity,
  notes,
}),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save your check-in.');

      setWeekNumber(data.weekNumber ?? weekNumber);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save your check-in.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="tester-page">
      <section className="tester-log wrap">
        <Link className="tester-back" to="/tester">← Back to your journal</Link>

        <div className="tester-log-header">
          <div className="tester-page-icon">
            <img src="/icons/tester_log.png" alt="" aria-hidden="true" />
          </div>
          <span className="tester-kicker">WEEKLY CHECK-IN</span>
          <h1>Week {weekNumber}</h1>
          <p>Tell us how your skin has been feeling this week. There are no right answers.</p>
        </div>

        {loading ? (
          <div className="tester-form-card"><p>Loading your check-in…</p></div>
        ) : (
          <form className="tester-form-card" onSubmit={submit}>
            <div className="tester-form-section">
              <span className="tester-form-number">01</span>
              <div>
                <h2>How does your skin feel after applying the product?</h2>
                <div className="tester-choice-grid">
                  {feels.map((feel) => (
                    <button
                      type="button"
                      key={feel.value}
                      className={afterUseFeel === feel.value ? 'tester-choice active' : 'tester-choice'}
                      onClick={() => setAfterUseFeel(feel.value)}
                    >
                      {feel.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="tester-form-section">
              <span className="tester-form-number">02</span>
              <div>
                <h2>How does your skin feel throughout the day?</h2>
                <div className="tester-choice-grid">
                  {feels.map((feel) => (
                    <button
                      type="button"
                      key={feel.value}
                      className={daytimeFeel === feel.value ? 'tester-choice active' : 'tester-choice'}
                      onClick={() => setDaytimeFeel(feel.value)}
                    >
                      {feel.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="tester-form-section">
              <span className="tester-form-number">03</span>
              <div className="tester-form-scales">
                <h2>Rate your skin this week</h2>
                <Scale label="Hydration" value={hydration} onChange={setHydration} helper="1 = very dehydrated · 5 = very hydrated" />
                <Scale label="Breakouts" value={breakouts} onChange={setBreakouts} helper="1 = none · 5 = severe" />
                <Scale label="Sensitivity" value={sensitivity} onChange={setSensitivity} helper="1 = none · 5 = severe" />
              </div>
            </div>

            <div className="tester-form-section">
              <span className="tester-form-number">04</span>
              <div className="tester-notes">
                <h2>Anything else you noticed?</h2>
                <p>Optional</p>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Tell us anything that stood out this week…"
                  rows={5}
                />
              </div>
            </div>

            {error && <div className="tester-form-error">{error}</div>}
            {saved && <div className="tester-form-success">Your Week {weekNumber} check-in has been saved.</div>}

            <button className="tester-submit" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save weekly check-in'}
              {!saving && <span>→</span>}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
