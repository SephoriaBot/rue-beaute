import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/react-router';
import { useApi } from '../lib/api';
import './my-skin.css';

const questions = [
  {
    title: 'When you wake up, before washing your face, how much oil do you notice?',
    hint: 'This is the most important question in determining your base skin type.',
    key: 'morningOil',
    options: [
      { value: 'dry', label: 'Little to no oil', detail: 'My skin looks and feels mostly matte.' },
      { value: 'normal', label: 'Some oil, but not a lot', detail: 'A blotting sheet picks up a moderate amount, roughly around half saturated.' },
      { value: 'oily', label: 'A lot of oil', detail: 'A blotting sheet becomes fully saturated or my face is noticeably oily.' },
    ],
  },
  {
    title: 'How does your skin usually feel and look throughout the day?',
    key: 'dayFeel',
    options: [
      { value: 'balanced', label: 'Comfortable and balanced', detail: 'My skin generally feels comfortable and does not become noticeably shiny.' },
      { value: 'shiny', label: 'Shiny by midday', detail: 'I notice oil and shine, especially around my forehead, nose, and chin.' },
      { value: 'tight', label: 'Tight or dry', detail: 'My skin tends to feel tight, dry, or uncomfortable as the day goes on.' },
      { value: 'reactive', label: 'Tight, stinging, or itchy', detail: 'My skin can feel uncomfortable, sting, itch, or become easily irritated.' },
    ],
  },
  {
    title: 'How quickly does your skin become shiny after cleansing?',
    key: 'shineSpeed',
    options: [
      { value: 'slow', label: 'It stays matte for quite a while' },
      { value: 'midday', label: 'I notice some shine by midday' },
      { value: 'quick', label: 'It becomes shiny fairly quickly' },
    ],
  },
  {
    title: 'How often do you experience breakouts?',
    key: 'breakouts',
    options: [
      { value: 'occasional', label: 'Occasionally', detail: 'Usually around hormones, stress, or other specific times.' },
      { value: 'regular', label: 'Regularly', detail: 'Breakouts are a recurring part of my skin concerns.' },
      { value: 'rare', label: 'Rarely', detail: 'Breakouts are uncommon for me.' },
    ],
  },
  {
    title: 'How does your skin usually react to new products or stronger skincare treatments?',
    key: 'treatmentReaction',
    options: [
      { value: 'tolerates', label: 'Usually tolerates them well' },
      { value: 'sometimes', label: 'Sometimes becomes dry or irritated' },
      { value: 'often', label: 'Often becomes irritated' },
      { value: 'very', label: 'Very easily irritated — I need to be careful with what I use' },
    ],
  },
  {
    title: 'Do you regularly experience any of the following?',
    hint: 'Select anything that regularly applies to your skin.',
    key: 'reactivity',
    multi: true,
    options: [
      { value: 'eczema', label: 'Eczema' },
      { value: 'dermatitis', label: 'Dermatitis' },
      { value: 'hives', label: 'Hives' },
      { value: 'redness', label: 'Persistent or recurring redness / irritation' },
      { value: 'environment', label: 'Noticeable reactions to environmental changes' },
      { value: 'none', label: 'None of these' },
    ],
  },
  {
    title: 'What would you most like to improve?',
    hint: 'Choose as many as you like. These personalize your routine without changing your skin type.',
    key: 'concerns',
    multi: true,
    options: [
      { value: 'dryness', label: 'Dryness' },
      { value: 'dehydration', label: 'Dehydration' },
      { value: 'oiliness', label: 'Oiliness' },
      { value: 'breakouts', label: 'Breakouts' },
      { value: 'redness', label: 'Redness / sensitivity' },
      { value: 'texture', label: 'Texture' },
      { value: 'dullness', label: 'Dullness' },
      { value: 'lines', label: 'Fine lines & wrinkles' },
      { value: 'tone', label: 'Uneven tone / dark spots' },
    ],
  },
] as const;

type Answers = Record<string, string | string[]>;
type BaseType = 'Dry' | 'Normal/Combination' | 'Oily';

const profileCopy: Record<BaseType, { description: string; routine: { title: string; text: string }[] }> = {
  Dry: {
    description: 'Your skin produces less oil and benefits from a routine focused on replenishing comfort, softness, and moisture.',
    routine: [
      { title: 'Cleanse', text: 'Cleanse gently for 20 seconds. Avoid over-cleansing or anything that leaves your skin feeling stripped.' },
      { title: 'Polish', text: 'Polish gently for 20 seconds. Keep exfoliation comfortable rather than aggressive.' },
      { title: 'Replenish', text: 'Pat your serum in for 7 seconds. Look for hydrating ingredients and replenishing oils.' },
      { title: 'Moisturize', text: 'Massage in a richer moisturizer for about 20–30 seconds using gentle upward movements.' },
      { title: 'SPF', text: 'Spread sunscreen evenly over the surface, then gently pat it into place.' },
    ],
  },
  'Normal/Combination': {
    description: 'Your skin sits between dry and oily, with a generally balanced feel and some variation across the face.',
    routine: [
      { title: 'Cleanse', text: 'Cleanse for 20 seconds with a balanced cleanser that removes buildup without feeling harsh.' },
      { title: 'Polish', text: 'Polish for 20 seconds. Keep exfoliation gentle and avoid anything overly aggressive.' },
      { title: 'Replenish', text: 'Pat your serum in for 7 seconds. Choose lightweight hydration that supports balance.' },
      { title: 'Moisturize', text: 'Massage in a comfortable gel-cream moisturizer for about 20–30 seconds using upward movements.' },
      { title: 'SPF', text: 'Spread sunscreen evenly over the surface, then gently pat it into place.' },
    ],
  },
  Oily: {
    description: 'Your skin produces more oil and benefits from lightweight hydration plus consistent, gentle polishing.',
    routine: [
      { title: 'Cleanse', text: 'Cleanse for 20 seconds with a cleanser that removes excess oil without leaving the skin stripped.' },
      { title: 'Polish', text: 'Polish for 20 seconds. This step is especially useful for keeping buildup and congestion in check, but it should never feel aggressive.' },
      { title: 'Replenish', text: 'Pat your serum in for 7 seconds. Favor lightweight, water-based hydration.' },
      { title: 'Moisturize', text: 'Massage in a lightweight gel or lotion for about 20–30 seconds using upward movements.' },
      { title: 'SPF', text: 'Spread sunscreen evenly over the surface, then gently pat it into place.' },
    ],
  },
};

function getBaseType(answers: Answers): BaseType {
  if (answers.morningOil === 'dry') return 'Dry';
  if (answers.morningOil === 'oily') return 'Oily';
  return 'Normal/Combination';
}

function isSensitive(answers: Answers) {
  const reaction = answers.treatmentReaction;
  const reactivity = Array.isArray(answers.reactivity) ? answers.reactivity : [];
  return reaction === 'often' || reaction === 'very' || reactivity.some((item) => item !== 'none');
}

function concernNotes(answers: Answers, baseType: BaseType, sensitive: boolean) {
  const concerns = Array.isArray(answers.concerns) ? answers.concerns : [];
  const notes: string[] = [];

  if (concerns.includes('dryness') || concerns.includes('dehydration')) {
    notes.push('Prioritize comfortable hydration and avoid products that leave your skin feeling tight.');
  }
  if (concerns.includes('oiliness')) {
    notes.push('Keep hydration lightweight rather than trying to remove every trace of oil.');
  }
  if (concerns.includes('breakouts')) {
    notes.push('Keep congestion care consistent and gentle; breakouts do not mean your skin needs to be stripped.');
  }
  if (concerns.includes('redness') || sensitive) {
    notes.push('Choose fragrance-free options and avoid aggressive treatments when your skin feels reactive.');
  }
  if (concerns.includes('texture')) {
    notes.push('A consistent, gentle polishing step can help improve the look and feel of texture.');
  }
  if (concerns.includes('dullness')) {
    notes.push('Consistency, gentle polishing, hydration, and daily SPF are the foundation for a brighter-looking complexion.');
  }
  if (concerns.includes('lines')) {
    notes.push('Fine lines are their own concern; dryness can make them look more noticeable, but lines do not determine your skin type.');
  }
  if (concerns.includes('tone')) {
    notes.push('Daily SPF is especially important when uneven tone or dark spots are a concern.');
  }
  if (!notes.length) {
    notes.push('Your ' + baseType.toLowerCase() + ' routine is designed to support balance without overcomplicating your skincare.');
  }

  return notes;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function MySkin() {
  const { isSignedIn, user } = useUser();
  const { apiFetch } = useApi();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showResults, setShowResults] = useState(false);

  const [loadingSaved, setLoadingSaved] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    let cancelled = false;

    async function loadSaved() {
      if (!isSignedIn || !user) {
        setLoadingSaved(false);
        return;
      }

      try {
        const res = await apiFetch('/api/skin-assessment');
        if (!res.ok) throw new Error('Failed to load saved assessment');
        const data = await res.json();

        if (!cancelled && data.assessment) {
          setAnswers(data.assessment.answers);
          setShowResults(true);
          setSaveState('saved');
        }
      } catch (err) {
        console.error('Could not load saved skin assessment:', err);
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    }

    loadSaved();
    return () => { cancelled = true; };
  }, [isSignedIn, user]);

  const current = questions[step];
  const answer = answers[current.key];
  const canContinue = Array.isArray(answer) ? answer.length > 0 : Boolean(answer);

  const result = useMemo(() => {
    const baseType = getBaseType(answers);
    const sensitive = isSensitive(answers);
    const profile = profileCopy[baseType];

    return {
      baseType,
      sensitive,
      title: sensitive ? 'Sensitive ' + baseType : baseType,
      description: sensitive
        ? profile.description + ' Your answers also suggest that your skin is more reactive, so your routine should stay especially gentle.'
        : profile.description,
      routine: profile.routine.map((item) => {
        if (sensitive && item.title === 'Polish') {
          return { ...item, text: 'Polish for 20 seconds only as tolerated. Keep this step very gentle and avoid aggressive exfoliation.' };
        }
        return item;
      }),
      notes: concernNotes(answers, baseType, sensitive),
    };
  }, [answers]);

  function choose(value: string) {
    if (current.multi) {
      const existing = Array.isArray(answer) ? answer : [];

      if (value === 'none') {
        setAnswers({ ...answers, [current.key]: existing.includes('none') ? [] : ['none'] });
        return;
      }

      const next = existing.filter((item) => item !== 'none');
      setAnswers({
        ...answers,
        [current.key]: next.includes(value) ? next.filter((item) => item !== value) : [...next, value],
      });
    } else {
      setAnswers({ ...answers, [current.key]: value });
    }
  }

  function next() {
    if (!canContinue) return;
    if (step === questions.length - 1) {
      setShowResults(true);
      setSaveState('idle');
    } else {
      setStep(step + 1);
    }
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setShowResults(false);
    setSaveState('idle');
  }

  async function saveResults() {
    if (!isSignedIn || !user) return;
    setSaveState('saving');

    try {
      const res = await apiFetch('/api/skin-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, result }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveState('saved');
    } catch (err) {
      console.error('Could not save skin assessment:', err);
      setSaveState('error');
    }
  }

  if (loadingSaved) {
    return (
      <main className="page-wrap my-skin-page">
        <div className="wrap my-skin-assessment">
          <p className="my-skin-footnote">Loading your skin profile…</p>
        </div>
      </main>
    );
  }

  if (showResults) {
    return (
      <main className="page-wrap my-skin-page">
        <div className="wrap">
          <section className="my-skin-result-intro">
            <img className="page-icon" src="/icons/skin_assessment.png" alt="" aria-hidden="true" />
            <span className="eyebrow">Your skin profile</span>
            <h1>{result.title}</h1>
            <p>{result.description}</p>

            {isSignedIn && (
              <div className="my-skin-save-row">
                <button className="my-skin-save-button" onClick={saveResults} disabled={saveState === 'saving'}>
                  {saveState === 'saving' && 'Saving…'}
                  {saveState === 'saved' && 'Saved ✓'}
                  {saveState === 'error' && 'Try saving again'}
                  {saveState === 'idle' && 'Save my results'}
                </button>
                {saveState === 'saved' && <span className="my-skin-saved-note">Saved to your account</span>}
                {saveState === 'error' && <span className="my-skin-saved-note error">Something went wrong — please try again.</span>}
              </div>
            )}

            {!isSignedIn && (
              <p className="my-skin-saved-note">
                <a href="/login">Log in</a> to save these results to your account.
              </p>
            )}
          </section>

          <section className="my-skin-section">
            <div className="my-skin-section-heading">
              <span className="eyebrow">Your routine</span>
              <h2>Simple, intentional skincare.</h2>
              <p>Use this as your everyday framework. Your skin does not need to be treated aggressively to be cared for well.</p>
            </div>

            <div className="my-skin-routine">
              {result.routine.map((item, index) => (
                <article className="my-skin-routine-card" key={item.title}>
                  <span className="my-skin-routine-number">0{index + 1}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="my-skin-section">
            <div className="my-skin-section-heading">
              <span className="eyebrow">Your focus</span>
              <h2>A few things to keep in mind.</h2>
            </div>
            <div className="my-skin-notes">
              {result.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </section>

          <section className="my-skin-disclaimer">
            <p>
              This assessment is intended for cosmetic skincare guidance and is not a medical diagnosis.
              If you have persistent or concerning skin symptoms, consider speaking with a qualified healthcare professional.
            </p>
          </section>

          <div className="my-skin-actions">
            <button className="my-skin-button secondary" onClick={restart}>Retake assessment</button>
            <a className="my-skin-button" href="/products">Explore Rue Beaute</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap my-skin-page">
      <div className="wrap my-skin-assessment">
        <section className="my-skin-intro">
          <img className="page-icon" src="/icons/skin_assessment.png" alt="" aria-hidden="true" />
          <span className="eyebrow">My Skin</span>
          <h1>Understand what your skin needs.</h1>
          <p>A short esthetician-informed assessment to help you understand your skin type, sensitivity, and everyday skincare priorities.</p>
        </section>

        <section className="my-skin-card" aria-label={'Question ' + (step + 1) + ' of ' + questions.length}>
          <div className="my-skin-progress">
            <span>0{step + 1} / 0{questions.length}</span>
            <div className="my-skin-progress-track">
              <div style={{ width: ((step + 1) / questions.length) * 100 + '%' }} />
            </div>
          </div>

          <div className="my-skin-question">
            <h2>{current.title}</h2>
            {current.hint && <p className="my-skin-hint">{current.hint}</p>}
          </div>

          <div className="my-skin-options">
            {current.options.map((option) => {
              const selected = Array.isArray(answer) ? answer.includes(option.value) : answer === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  className={'my-skin-option' + (selected ? ' selected' : '')}
                  onClick={() => choose(option.value)}
                  aria-pressed={selected}
                >
                  <span className="my-skin-option-mark" aria-hidden="true">{selected ? '✓' : ''}</span>
                  <span>
                    <strong>{option.label}</strong>
                    {'detail' in option && option.detail && <small>{option.detail}</small>}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="my-skin-navigation">
            <button className="my-skin-button secondary" onClick={back} disabled={step === 0}>Back</button>
            <button className="my-skin-button" onClick={next} disabled={!canContinue}>
              {step === questions.length - 1 ? 'See my skin profile' : 'Continue'}
            </button>
          </div>
        </section>

        <p className="my-skin-footnote">A cosmetic skincare guide — not a medical diagnosis.</p>
      </div>
    </main>
  );
}