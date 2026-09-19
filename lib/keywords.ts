/**
 * Extracts weighted, human-readable keywords from an article's title, body,
 * tags and excerpt. These terms power:
 *   - /topics/[slug] landing pages (programmatic SEO)
 *   - "Related stories" internal links (articles sharing keywords)
 *   - meta keyword tags / JSON-LD on story pages
 *
 * Approach: score 1-3 word n-grams by weighted frequency (title and source
 * tags count for more than body text), drop noise, then collapse simple plural
 * variants so "databases" and "database" merge.
 *
 * Two stopword tiers:
 *   - HARD (function words, aggregator boilerplate): rejected anywhere, so a
 *     phrase containing one is dropped ("the rust").
 *   - SOFT (generic content words: "built", "models", "update"): rejected
 *     only as a standalone term, so "language models" and "diffusion models"
 *     survive while the bare word "models" does not.
 */

export interface ExtractedKeyword {
  term: string;
  weight: number;
}

const MIN_TERM_LENGTH = 3;

/** Short but meaningful tech terms that would otherwise be filtered out. */
const ALLOWED_SHORT_TERMS = new Set([
  "ai", "js", "ts", "go", "os", "ui", "ux", "db", "ml", "api", "cli", "css",
  "sql", "npm", "aws", "gcp", "gpt", "llm", "ios", "gpu", "cpu", "ram", "ssd",
  "vpn", "dns", "http", "grpc", "rest", "ci", "cd", "vm", "pc", "vr", "ar",
  "xr", "3d", "2d", "ip", "io",
]);

/** Function words and aggregator boilerplate. Never meaningful, anywhere. */
const HARD_STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "also", "am", "an",
  "and", "any", "are", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "cannot", "could", "did", "do",
  "does", "doing", "down", "during", "each", "few", "for", "from", "further",
  "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
  "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off",
  "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over",
  "own", "same", "she", "should", "so", "some", "such", "than", "that", "the",
  "their", "theirs", "them", "themselves", "then", "there", "these", "they",
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
  "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why",
  "will", "with", "would", "you", "your", "yours", "yourself", "yourselves",
  "via", "per", "vs", "versus", "etc", "ago", "non", "don", "dont", "doesnt",
  "isnt", "wasnt", "arent", "wont", "cant", "couldnt", "shouldnt", "wouldnt",
  "youre", "theyre", "weve", "ive", "im", "youll", "well", "thats", "theres",
  "show", "ask", "tell", "hn", "hacker", "news", "story", "stories", "article",
  "articles", "post", "posts", "comment", "comments", "link", "links", "site",
  "website", "page", "pages", "read", "reading", "today", "tomorrow", "week",
  "month", "year", "years", "day", "days", "time", "times", "2024", "2025",
  "2026", "2027",
]);

/** Generic content words: fine inside a phrase, noise as a standalone term. */
const SOFT_STOPWORDS = new Set([
  "new", "old", "latest", "better", "best", "worse", "worst", "good", "great",
  "bad", "big", "small", "large", "fast", "slow", "easy", "simple", "hard",
  "built", "build", "builds", "building", "make", "makes", "made", "making",
  "use", "uses", "used", "using", "get", "gets", "got", "getting",
  "release", "releases", "released", "releasing", "launch", "launches",
  "launched", "launching", "announce", "announces", "announced", "announcing",
  "update", "updates", "updated", "updating", "upgrade", "upgrades",
  "version", "versions", "feature", "features", "change", "changes", "changed",
  "support", "supports", "supported", "adding", "add", "adds", "added",
  "introduce", "introduces", "introduced", "introducing", "introduction",
  "guide", "guides", "tutorial", "tutorials", "overview", "review", "reviews",
  "tips", "ways", "way", "things", "thing", "stuff", "another", "various",
  "multiple", "several", "number", "series", "part", "parts", "start",
  "started", "starting", "issue", "issues", "problem", "problems", "question",
  "questions", "answer", "answers", "example", "examples", "case", "cases",
  "said", "says", "according", "report", "reports", "reported", "first", "last",
  "next", "top", "much", "many", "may", "might", "must", "need", "needs",
  "want", "wants", "learn", "learning" /* learning survives in "machine learning" */,
  "help", "helps", "work", "works", "working", "run", "runs", "running",
  "one", "two", "three", "four", "five", "six", "ten", "hundred", "thousand",
  "models", "model", "language", "languages", "decision", "decisions",
  "people", "person", "thing", "things", "company", "companies", "world",
  "hour", "hours", "minute", "minutes", "second", "seconds",
  // Generic verbs/adjectives that flood counts at scale.
  "keep", "keeps", "keeping", "stay", "stays", "go", "goes", "going", "gone",
  "come", "comes", "coming", "take", "takes", "taking", "took", "give",
  "gives", "given", "look", "looks", "looking", "call", "calls", "called",
  "find", "finds", "found", "know", "knows", "known", "think", "thinks",
  "see", "sees", "seen", "put", "puts", "turn", "turns", "move", "moves",
  "moving", "grow", "grows", "growing", "reach", "reaches", "hit", "hits",
  "set", "sets", "setting", "end", "ends", "ending", "open", "opens",
  "opening", "close", "closes", "closing", "raise", "raises", "drop", "drops",
  "cut", "cuts", "sell", "sells", "buy", "buys", "win", "wins", "lose",
  "loses", "losing", "lead", "leads", "leading", "push", "pushes", "pull",
  "pulls", "send", "sends", "bring", "brings", "hold", "holds", "face",
  "faces", "largest", "smallest", "biggest", "newest", "fastest", "slowest",
  "highest", "lowest", "longest", "shortest",
]);

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, " ")
    .replace(/&gt;/g, " ")
    .replace(/&quot;/g, " ")
    .replace(/&#39;/g, " ")
    .replace(/&nbsp;/g, " ");
}

function tokenize(value: string): string[] {
  return stripMarkup(value.toLowerCase())
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

/**
 * Splits text into clauses so n-grams never span punctuation
 * ("learning. Another" must not become "learning another").
 */
function clauses(value: string): string[] {
  return stripMarkup(value)
    .split(/[.!?;:,\n\r\t()\[\]{}"“”/\\|]+/)
    .flatMap((part) => part.split(/\s[-–—]\s/))
    .map((part) => part.trim())
    .filter(Boolean);
}

function passesLength(token: string): boolean {
  if (token.length < 2) return false;
  if (/^\d+$/.test(token)) return false;
  if (token.length < MIN_TERM_LENGTH && !ALLOWED_SHORT_TERMS.has(token)) {
    return false;
  }
  return true;
}

/** A token allowed anywhere: rejects function words but keeps soft words. */
function isGramToken(token: string): boolean {
  return passesLength(token) && !HARD_STOPWORDS.has(token);
}

/**
 * Lossy key used only for merging variants; the displayed term is always a
 * real surface form from the text.
 */
function groupKey(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) {
    return `${token.slice(0, -3)}y`;
  }
  if (
    token.length > 4 &&
    token.endsWith("s") &&
    !token.endsWith("ss") &&
    !token.endsWith("us") &&
    !token.endsWith("is") &&
    !token.endsWith("os")
  ) {
    return token.slice(0, -1);
  }
  return token;
}

function collectPhrases(
  value: string,
  weight: number,
  into: Map<string, number>,
): void {
  for (const clause of clauses(value)) {
    const tokens = tokenize(clause);
    for (let length = 1; length <= 3; length++) {
      const factor = length === 1 ? 1 : length === 2 ? 0.9 : 0.75;
      for (let i = 0; i + length <= tokens.length; i++) {
        const gram = tokens.slice(i, i + length);
        if (!gram.every(isGramToken)) continue;
        // Standalone generic words are noise; inside a phrase they add context.
        if (length === 1 && SOFT_STOPWORDS.has(gram[0])) continue;
        const surface = gram.join(" ");
        into.set(surface, (into.get(surface) ?? 0) + weight * factor);
      }
    }
  }
}

export interface ExtractKeywordsInput {
  title?: string;
  text?: string;
  excerpt?: string;
  /** Source-provided tags (Lobsters, dev.to). Curated, so weighted highest. */
  tags?: string[];
  limit?: number;
}

export function extractKeywords(input: ExtractKeywordsInput): ExtractedKeyword[] {
  const surfaceWeights = new Map<string, number>();

  if (input.title) collectPhrases(input.title, 3, surfaceWeights);
  if (input.excerpt) collectPhrases(input.excerpt, 1, surfaceWeights);
  if (input.text) collectPhrases(input.text, 1, surfaceWeights);
  for (const tag of input.tags ?? []) {
    collectPhrases(tag.replace(/[-_]+/g, " "), 2.5, surfaceWeights);
  }

  // Collapse variants ("databases" -> "database") onto one term.
  const merged = new Map<string, ExtractedKeyword>();
  for (const [surface, weight] of surfaceWeights) {
    const key = surface.split(" ").map(groupKey).join(" ");
    const existing = merged.get(key);
    if (!existing || weight > existing.weight) {
      merged.set(key, { term: surface, weight });
    }
  }

  const limit = input.limit ?? 8;
  return [...merged.values()]
    .filter((keyword) => keyword.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((keyword) => ({
      term: keyword.term,
      weight: Math.round(keyword.weight * 1000) / 1000,
    }));
}
