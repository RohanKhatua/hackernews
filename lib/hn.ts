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
}

const HN_BASE_URL = "https://hacker-news.firebaseio.com/v0";

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
  const stories = await Promise.all(ids.map((id) => fetchStory(id)));
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
