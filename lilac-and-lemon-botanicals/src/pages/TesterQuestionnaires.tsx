import { Link, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react-router';
import { useApi } from '../lib/api';
import { useEffect, useState } from 'react';

type Answers = {
  skinType: string;
  concerns: string;
  sensitivity: string;
  routine: string;
  currentProducts: string;
  ingredientSensitivities: string;
  notes: string;
};

const emptyAnswers: Answers = {
  skinType: '',
  concerns: '',
  sensitivity: '',
  routine: '',
  currentProducts: '',
  ingredientSensitivities: '',
  notes: '',
};

export default function TesterQuestionnaires() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { apiFetch } = useApi();

  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isSignedIn || !user) {
      setLoading(false);
      return;
    }

    async function loadQuestionnaire() {
      try {
        const res = await apiFetch('/api/tester/questionnaire');

        if (!res.ok) {
          throw new Error('Failed to load questionnaire');
        }

        const data = await res.json();

        if (data.questionnaire?.answers) {
          setAnswers({
            ...emptyAnswers,
            ...data.questionnaire.answers,
          });
        }
      } catch (err) {
        console.error('Could not load questionnaire:', err);
        setError('Could not load your questionnaire.');
      } finally {
        setLoading(false);
      }
    }

    loadQuestionnaire();
  }, [isSignedIn, user]);

  function updateAnswer(field: keyof Answers, value: string) {
    setAnswers((current) => ({
      ...current,
      [field]: value,
    }));
    setSaved(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!user) return;

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const res = await apiFetch('/api/tester/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Could not save questionnaire.');
      }

      setSaved(true);
    } catch (err) {
      console.error('Questionnaire save failed:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save your questionnaire.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded || loading) {
    return null;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="tester-page">
      <section className="tester-hero wrap">
        <div className="tester-page-icon">
          <img src="/icons/tester_questionnaire.png" alt="" aria-hidden="true" />
        </div>
        <div className="tester-eyebrow">
          Rue Beaute · TESTER PORTAL
        </div>

        <h1>Your starting questionnaire.</h1>

        <p>
          Tell us a little about your skin and your usual routine before
          you begin testing.
        </p>
      </section>

      <section className="tester-content wrap">
        <form onSubmit={handleSubmit} className="tester-form">

          <div className="tester-form-field">
            <label htmlFor="skinType">What is your skin type?</label>
            <select
              id="skinType"
              value={answers.skinType}
              onChange={(event) =>
                updateAnswer('skinType', event.target.value)
              }
              required
            >
              <option value="">Select one</option>
              <option value="Dry">Dry</option>
              <option value="Normal">Normal</option>
              <option value="Combination">Combination</option>
              <option value="Oily">Oily</option>
              <option value="Not sure">Not sure</option>
            </select>
          </div>

          <div className="tester-form-field">
            <label htmlFor="concerns">
              What are your main skin concerns?
            </label>
            <textarea
              id="concerns"
              value={answers.concerns}
              onChange={(event) =>
                updateAnswer('concerns', event.target.value)
              }
              placeholder="For example: dryness, breakouts, redness, uneven texture..."
              required
            />
          </div>

          <div className="tester-form-field">
            <label htmlFor="sensitivity">
              How would you describe your skin's sensitivity?
            </label>
            <select
              id="sensitivity"
              value={answers.sensitivity}
              onChange={(event) =>
                updateAnswer('sensitivity', event.target.value)
              }
              required
            >
              <option value="">Select one</option>
              <option value="Not sensitive">Not sensitive</option>
              <option value="Somewhat sensitive">Somewhat sensitive</option>
              <option value="Very sensitive">Very sensitive</option>
              <option value="Not sure">Not sure</option>
            </select>
          </div>

          <div className="tester-form-field">
            <label htmlFor="routine">
              What is your current skincare routine?
            </label>
            <textarea
              id="routine"
              value={answers.routine}
              onChange={(event) =>
                updateAnswer('routine', event.target.value)
              }
              placeholder="Tell us what you normally do morning and night."
              required
            />
          </div>

          <div className="tester-form-field">
            <label htmlFor="currentProducts">
              What skincare products are you currently using?
            </label>
            <textarea
              id="currentProducts"
              value={answers.currentProducts}
              onChange={(event) =>
                updateAnswer('currentProducts', event.target.value)
              }
              placeholder="Product names or types are both fine."
              required
            />
          </div>

          <div className="tester-form-field">
            <label htmlFor="ingredientSensitivities">
              Are there any ingredients you know your skin does not tolerate?
            </label>
            <textarea
              id="ingredientSensitivities"
              value={answers.ingredientSensitivities}
              onChange={(event) =>
                updateAnswer(
                  'ingredientSensitivities',
                  event.target.value
                )
              }
              placeholder="If none, write none."
              required
            />
          </div>

          <div className="tester-form-field">
            <label htmlFor="notes">
              Anything else we should know before you begin?
            </label>
            <textarea
              id="notes"
              value={answers.notes}
              onChange={(event) =>
                updateAnswer('notes', event.target.value)
              }
              placeholder="Anything that may be useful while reviewing your test results."
            />
          </div>

          {error && (
            <div className="tester-note">
              <h3>Something went wrong</h3>
              <p>{error}</p>
            </div>
          )}

          {saved && (
            <div className="tester-note">
              <p>Your questionnaire has been saved.</p>
            </div>
          )}

          <button
            type="submit"
            className="tester-task-action"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save questionnaire'}
          </button>
        </form>
      </section>

      <section className="tester-content wrap">
        <Link to="/tester">← Back to dashboard</Link>
      </section>
    </main>
  );
}