import { useEffect, useState } from 'react';
import './home-feed.css';

type FeedItem = {
  title: string;
  link: string;
  source: string;
  date: string | null;
  snippet: string;
  image: string | null;
  topics: string[];
};

const TOPICS = ['Skincare', 'Makeup', 'Hair', 'Nails', 'Fragrance', 'Ingredients'];
const STORAGE_KEY = 'rue-feed-topics';
const MAX_SHOWN = 40;

function loadSaved(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => TOPICS.includes(t)) : [];
  } catch {
    return [];
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (Number.isNaN(mins) || mins < 0) return '';
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : '';
}

export default function Home() {
  const [selected, setSelected] = useState<string[]>(loadSaved);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/feed')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Feed failed'))))
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function save(next: string[]) {
    setSelected(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing can block storage; the filter still works for this visit.
    }
  }

  function toggle(topic: string) {
    save(selected.includes(topic) ? selected.filter((t) => t !== topic) : [...selected, topic]);
  }

  const visible = (
    selected.length === 0
      ? items
      : items.filter((item) => item.topics.some((t) => selected.includes(t)))
  ).slice(0, MAX_SHOWN);

  return (
    <main className="feed-page">
      <header className="feed-head">
        <span className="eyebrow">Rue Beauté</span>
        <h1>Today in beauty</h1>
        <p>Fresh headlines from around the beauty world. Pick what you want to see.</p>
      </header>

      <div className="feed-chips" role="group" aria-label="Choose topics">
        <button
          type="button"
          className={`feed-chip${selected.length === 0 ? ' on' : ''}`}
          aria-pressed={selected.length === 0}
          onClick={() => save([])}
        >
          All
        </button>
        {TOPICS.map((topic) => (
          <button
            key={topic}
            type="button"
            className={`feed-chip${selected.includes(topic) ? ' on' : ''}`}
            aria-pressed={selected.includes(topic)}
            onClick={() => toggle(topic)}
          >
            {topic}
          </button>
        ))}
      </div>

      {status === 'loading' && <p className="feed-note">Loading the latest…</p>}
      {status === 'error' && (
        <p className="feed-note">Couldn’t load the feed right now. Please try again in a bit.</p>
      )}
      {status === 'ready' && visible.length === 0 && (
        <p className="feed-note">
          {items.length === 0
            ? 'No headlines yet. Check back soon.'
            : 'Nothing new for those topics yet. Try adding another one.'}
        </p>
      )}

      <ul className="feed-list">
        {visible.map((item) => (
          <li key={item.link}>
            <a
              className="feed-card"
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.image && (
                <img
                  className="feed-thumb"
                  src={item.image}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div className="feed-body">
                <span className="feed-meta">
                  {item.source}
                  {timeAgo(item.date) && ` · ${timeAgo(item.date)}`}
                </span>
                <h2>{item.title}</h2>
                {item.snippet && <p>{item.snippet}</p>}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
