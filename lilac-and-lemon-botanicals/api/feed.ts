import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseFeed, type FeedItem } from './_lib/rss.js';

type Feed = {
  source: string;
  url: string;
  // For broad feeds (like all FDA consumer news): keep only beauty-related items.
  onlyTagged?: boolean;
};

// Add, remove, or swap feeds here. Any standard RSS/Atom URL works.
// To add Cosmetics Design or the AAD, copy the "RSS Feed" link from their
// websites and add a line in the same format.
const FEEDS: Feed[] = [
  { source: 'Lab Muffin Beauty Science', url: 'https://labmuffin.com/feed/' },
  { source: 'Into The Gloss', url: 'https://intothegloss.com/feed/' },
  {
    source: 'FDA',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/consumer-updates/rss.xml',
    onlyTagged: true,
  },
];

// Backup filter: skip celebrity-driven headlines.
const CELEB_RE =
  /\b(?:celebs?|celebrit(?:y|ies)|red carpet|met gala|kardashian|jenner|oscars|royal family)\b/i;

const CACHE_MS = 30 * 60_000;
const FETCH_TIMEOUT_MS = 6000;
const MAX_FEED_CHARS = 600_000;
const MAX_ITEMS = 60;

let cache: { at: number; items: FeedItem[] } | null = null;

async function loadFeed(feed: Feed): Promise<FeedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RueBeauteFeed/1.0 (+headline reader)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const xml = (await r.text()).slice(0, MAX_FEED_CHARS);
    return parseFeed(xml, feed.source).filter(
      (item) =>
        !CELEB_RE.test(item.title) && (!feed.onlyTagged || item.topics.length > 0)
    );
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return res.status(200).json({ items: cache.items });
  }

  const results = await Promise.allSettled(FEEDS.map(loadFeed));

  const seen = new Set<string>();
  const items: FeedItem[] = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`Feed failed (${FEEDS[i].source}):`, result.reason);
      return;
    }
    for (const item of result.value) {
      if (seen.has(item.link)) continue;
      seen.add(item.link);
      items.push(item);
    }
  });

  items.sort((a, b) => (b.date ? Date.parse(b.date) : 0) - (a.date ? Date.parse(a.date) : 0));
  const trimmed = items.slice(0, MAX_ITEMS);

  // Only keep a result worth reusing; if every feed failed, try again next time.
  if (trimmed.length > 0) cache = { at: Date.now(), items: trimmed };

  return res.status(200).json({ items: trimmed });
}
