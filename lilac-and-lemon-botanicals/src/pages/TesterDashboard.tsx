import { Link, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react-router';
import { useApi } from '../lib/api';
import { useEffect, useState } from 'react';
import { bottleImages } from '../productImages';


const setupTasks = [
  {
    title: 'Upload your baseline photos',
    description: 'Take your starting photos so you can compare your progress later.',
    to: '/tester/photos',
    action: 'Add photos',
    icon: '/icons/cameo.png',
  },
  {
    title: 'Complete your starting questionnaire',
    description: 'A few questions about your skin and your usual routine.',
    to: '/tester/questionnaires',
    action: 'Answer questions',
    icon: '/icons/journal.png',
  },
];

type Tester = {
  id: number;
  user_id: string;
  name: string;
  status: string;
  test_start: string | null;
  test_end: string | null;
};

type TesterProduct = {
  assignment_id: number;
  id: number;
  name: string;
  description: string | null;
  swatch_color: string | null;
  size_oz: number | null;
  price: number | null;
};

export default function TesterDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { apiFetch } = useApi();
  const [tester, setTester] = useState<Tester | null>(null);
  const [loadingTester, setLoadingTester] = useState(true);
  const [checkins, setCheckins] = useState(0);
  const [products, setProducts] = useState<TesterProduct[]>([]);
  const [photos, setPhotos] = useState(0);
  const [fullName, setFullName] = useState('');

useEffect(() => {
  if (!isSignedIn || !user) {
    setLoadingTester(false);
    return;
  }

  async function loadTester() {
    try {
      const res = await apiFetch('/api/tester/profile');

      if (!res.ok) {
        throw new Error('Failed to load tester');
      }

      const data = await res.json();
      setTester(data.tester ?? null);

      const profileRes = await apiFetch('/api/account');

if (profileRes.ok) {
  const profileData = await profileRes.json();
  setFullName(profileData.profile?.fullName ?? '');
}

      const statsRes = await apiFetch('/api/tester/stats');

if (statsRes.ok) {
  const statsData = await statsRes.json();
  setCheckins(statsData.checkins ?? 0);
  setPhotos(statsData.photos ?? 0);
}

const productsRes = await apiFetch('/api/tester/products');

if (productsRes.ok) {
  const productsData = await productsRes.json();
  setProducts(productsData.products ?? []);
}
    } catch (err) {
      console.error('Could not load tester:', err);
      setTester(null);
    } finally {
      setLoadingTester(false);
    }
  }

  loadTester();
}, [isSignedIn, user]);

  if (!isLoaded) {
    return null;
  }

if (!isSignedIn) {
  return <Navigate to="/login" replace />;
}

if (loadingTester) {
  return null;
}

if (!tester || tester.status !== 'active') {
  return (
    <main className="tester-page">
      <section className="tester-hero wrap">
        <div className="tester-eyebrow">Rue Beaute · TESTER PORTAL</div>
        <h1>You’re not currently enrolled as a tester.</h1>
        <p>
          This area is for Rue Beaute product testers. If you’ve been
          invited to participate in a test, your enrollment will appear here
          once it has been activated.
        </p>
      </section>
    </main>
  );
}

const testStart = tester.test_start
  ? new Date(tester.test_start)
  : null;

const testEnd = tester.test_end
  ? new Date(tester.test_end)
  : null;

const testingDay = testStart
  ? Math.max(
      1,
      Math.floor(
        (Date.now() - testStart.getTime()) / 86400000
      ) + 1
    )
  : 1;

const totalDays =
  testStart && testEnd
    ? Math.max(
        1,
        Math.floor(
          (testEnd.getTime() - testStart.getTime()) / 86400000
        ) + 1
      )
    : 28;

const progress = Math.min(
  100,
  Math.round((testingDay / totalDays) * 100)
);

const stats = [
  { label: 'Testing day', value: `${testingDay}`, detail: `of ${totalDays}`, icon: '/icons/calendar.png' },
  { label: 'Products', value: String(products.length), detail: 'assigned', icon: '/icons/serum-dropper.png' },
  { label: 'Check-ins', value: String(checkins), detail: 'completed', icon: '/icons/journal.png' },
  { label: 'Photos', value: String(photos), detail: 'uploaded', icon: '/icons/cameo.png' },
];

  return (
    <main className="tester-page">
      <section className="tester-hero wrap">
        <div className="tester-page-icon">
          <img src="/icons/welcome-wreath.png" alt="" aria-hidden="true" />
        </div>
        <div className="tester-eyebrow">Rue Beaute · TESTER PORTAL</div>
        <h1>
  Welcome{fullName ? `, ${fullName}` : ''}
  <br />
  to your testing journal.
</h1>
        <p>
          Thank you for helping us test and improve Rue Beaute.
          Everything you record here helps us understand how our formulas
          perform in real routines.
        </p>

        <div className="tester-progress">
          <div className="tester-progress-top">
            <span>Testing progress</span>
            <strong>Day {testingDay} of {totalDays}</strong>
          </div>
          <div className="tester-progress-track">
            <div className="tester-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <section className="tester-primary-cta wrap">
        <div className="tester-primary-cta-text">
          <div className="tester-section-heading-icon-wrap">
            <img className="tester-section-heading-icon" src="/icons/tester_dashboard.png" alt="" aria-hidden="true" />
            <span className="tester-kicker">TODAY'S ENTRY</span>
          </div>
          <h2>Log how your skin feels today</h2>
          <p>Takes about a minute. Do this once a day while you're testing.</p>
        </div>
        <Link className="tester-primary-cta-button" to="/tester/log">
          Start today's log
          <span>→</span>
        </Link>
      </section>

      <section className="tester-stats wrap">
        {stats.map((stat) => (
          <div className="tester-stat" key={stat.label}>
            <img className="tester-stat-icon" src={stat.icon} alt="" aria-hidden="true" />
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.detail}</small>
          </div>
        ))}
      </section>

      <section className="tester-content wrap">
        <div className="tester-section-heading">
          <div className="tester-section-heading-icon-wrap">
            <img className="tester-section-heading-icon" src="/icons/gear.png" alt="" aria-hidden="true" />
            <div>
              <span className="tester-kicker">GETTING SET UP</span>
              <h2>One-time setup</h2>
            </div>
          </div>
          <span className="tester-date">Today</span>
        </div>

        <div className="tester-task-list">
          {setupTasks.map((task, index) => (
            <article className="tester-task" key={task.title}>
              <div className="tester-task-icon">
                <img src={task.icon} alt="" aria-hidden="true" />
              </div>

              <div className="tester-task-body">
                <h3>{task.title}</h3>
                <p>{task.description}</p>
              </div>

              <Link className="tester-task-action" to={task.to}>
                {task.action}
                <span>→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="tester-content wrap">
        <div className="tester-section-heading">
          <div className="tester-section-heading-icon-wrap">
            <img className="tester-section-heading-icon" src="/icons/serum-dropper.png" alt="" aria-hidden="true" />
            <div>
              <span className="tester-kicker">YOUR PRODUCTS</span>
              <h2>Currently testing</h2>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="tester-empty-state">
            <img src="/illustrations/03_flower_basket.png" alt="" aria-hidden="true" />
            <p>Your assigned products will show up here once your testing kit is set up.</p>
          </div>
        ) : (
        <div className="tester-products">
          {products.map((product, index) => (
  <div className="tester-product" key={product.assignment_id}>
    <div
      className="tester-product-placeholder"
      style={{ backgroundColor: product.swatch_color || undefined }}
    >
      <img
        src={bottleImages[product.id] || '/icons/serum-dropper.png'}
        alt={`${product.name} bottle`}
      />
    </div>

    <div>
      <span>Assigned product</span>
      <h3>{product.name}</h3>
      <p>
        {product.description || 'Use as directed in your testing instructions.'}
      </p>
    </div>
  </div>
))}
        </div>
        )}
      </section>

      <section className="tester-note wrap">
        <div className="tester-note-icon">
          <img src="/icons/heart.png" alt="" aria-hidden="true" />
        </div>
        <div>
          <h3>A little reminder</h3>
          <p>
            Please be honest about your experience, even when something
            isn't perfect. Your feedback is most useful when it's genuine.
          </p>
        </div>
      </section>
    </main>
  );
}