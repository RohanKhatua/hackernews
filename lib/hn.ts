export interface HackerNewsStory {
  id: number;
  title: string;
  url?: string;
  score?: number;
  by?: string;
  time?: number;
  descendants?: number;
  type?: string;
  text?: string;
  kids?: number[];
  /** Short excerpt of the linked article (or the story's own text), used in emails and on the site. */
  excerpt?: string;
}

const HN_BASE_URL = "https://hacker-news.firebaseio.com/v0";

/** Max simultaneous item fetches; unbounded parallelism can exhaust file descriptors (EMFILE). */
const FETCH_CONCURRENCY = 10;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function fetchStoryIds(
  type: "top" | "new" | "best" | "ask" | "show" | "job" = "top",
) {
  const endpoints = {
    top: "topstories",
    new: "newstories",
    best: "beststories",
    ask: "askstories",
    show: "showstories",
    job: "jobstories",
  };

  try {
    const response = await fetch(`${HN_BASE_URL}/${endpoints[type]}.json`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${type} story ids`);
    }

    return (await response.json()) as number[];
  } catch (error) {
    console.error("Error fetching story IDs:", error);
    return [];
  }
}

export async function fetchStory(id: number) {
  try {
    const response = await fetch(`${HN_BASE_URL}/item/${id}.json`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch story ${id}`);
    }

    return (await response.json()) as HackerNewsStory | null;
  } catch (error) {
    console.error("Error fetching story:", error);
    return null;
  }
}

export async function fetchStories(ids: number[]) {
  // Dedupe and fetch with bounded concurrency: firing every request at once
  // (e.g. the full topstories list during a newsletter broadcast) opens too
  // many sockets and fails with EMFILE ("too many open files").
  const uniqueIds = Array.from(new Set(ids));
  const stories = await mapWithConcurrency(
    uniqueIds,
    FETCH_CONCURRENCY,
    (id) => fetchStory(id),
  );
  return stories.filter((story): story is HackerNewsStory =>
    Boolean(story?.id && story.title),
  );
}

export function getStoryDomain(url?: string) {
  if (!url) return null;

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
