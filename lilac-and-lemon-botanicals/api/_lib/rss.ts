// Tiny RSS/Atom reader + topic tagger for the home-page beauty feed.
// No dependencies. Everything returned is plain text (React escapes it on render).

export type FeedItem = {
  title: string;
  link: string;
  source: string;
  date: string | null;
  snippet: string;
  image: string | null;
  topics: string[];
};

export const TOPIC_PATTERNS: Record<string, RegExp> = {
  Skincare:
    /\b(?:skin|serum|moisturi[sz]|sunscreen|spf\b|cleanser|toner|acne|wrinkle|anti-?aging|facial|eye cream|hydrat|pores?\b)/i,
  Makeup:
    /\b(?:makeup|make-up|foundation|lipstick|mascara|eyeshadow|eyeliner|blush\b|concealer|lip gloss|bronzer|highlighter|palette|brows?\b|contour)/i,
  Hair: /\b(?:hair|shampoo|conditioner|scalp|curls?\b|braids?\b|haircut|blowout|bangs\b)/i,
  Nails: /\b(?:nails?\b|manicure|pedicure|nail polish)/i,
  Fragrance: /\b(?:fragrance|perfume|cologne|eau de|scent)/i,
  Ingredients:
    /\b(?:ingredient|niacinamide|retinol|retinoid|vitamin c|hyaluronic|peptide|ceramide|salicylic|glycolic|collagen|squalane)/i,
};

export function tagTopics(text: string): string[] {
  return Object.entries(TOPIC_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([name]) => name);
}

function safeCodePoint(n: number): string {
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => safeCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => safeCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function toText(raw: string | null): string {
  if (!raw) return '';
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return decodeEntities(unwrapped)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tagContent(block: string, name: string): string | null {
  const m = block.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')
  );
  return m ? m[1] : null;
}

function attr(block: string, tag: string, attrName: string): string | null {
  const m = block.match(
    new RegExp(`<${tag}\\b[^>]*\\s${attrName}=["']([^"']+)["']`, 'i')
  );
  return m ? decodeEntities(m[1]) : null;
}

function httpsOnly(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function webLink(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function parseFeed(xml: string, source: string, maxItems = 15): FeedItem[] {
  const blocks =
    xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ??
    xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ??
    [];

  const items: FeedItem[] = [];

  for (const block of blocks.slice(0, maxItems)) {
    const title = toText(tagContent(block, 'title'));

    const link = webLink(
      toText(tagContent(block, 'link')) ||
        attr(block, 'link', 'href') ||
        null
    );
    if (!title || !link) continue;

    const dateRaw = toText(
      tagContent(block, 'pubDate') ??
        tagContent(block, 'published') ??
        tagContent(block, 'updated') ??
        tagContent(block, 'dc:date')
    );
    const time = dateRaw ? new Date(dateRaw).getTime() : NaN;

    let snippet = toText(
      tagContent(block, 'description') ?? tagContent(block, 'summary')
    );
    if (snippet.length > 160) snippet = snippet.slice(0, 157).trimEnd() + '…';

    const image = httpsOnly(
      attr(block, 'media:content', 'url') ||
        attr(block, 'media:thumbnail', 'url') ||
        attr(block, 'enclosure', 'url')
    );

    items.push({
      title,
      link,
      source,
      date: Number.isNaN(time) ? null : new Date(time).toISOString(),
      snippet,
      image,
      topics: tagTopics(`${title} ${snippet}`),
    });
  }

  return items;
}
