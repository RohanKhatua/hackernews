import {
  fetchJson,
  type NewsCategory,
  type NewsItem,
  type NewsProvider,
} from "@/lib/sources/types";

const REDDIT_SOURCE_ID = "reddit";
const REDDIT_DISPLAY_NAME = "Reddit";
const REDDIT_CATEGORIES: readonly NewsCategory[] = ["top", "new", "best"];

// Reddit asks API clients to identify themselves.
const REDDIT_HEADERS = {
  "user-agent": "web:hacker-news-but-better:1.0 (by /u/rohankhatua)",
};

const DEFAULT_SUBREDDITS = ["programming", "webdev", "technology", "javascript"];

type RedditListing = {
  data?: {
    children?: Array<{
      data?: {
        id: string;
        title?: string;
        url?: string;
        selftext?: string;
        author?: string;
        ups?: number;
        num_comments?: number;
        created_utc?: number;
        permalink?: string;
        is_self?: boolean;
        over_18?: boolean;
        stickied?: boolean;
        link_flair_text?: string | null;
      };
    }>;
  };
};

function sortForCategory(category: NewsCategory): string {
  switch (category) {
    case "new":
      return "new";
    case "best":
      return "hot";
    default:
      return "top";
  }
}

function toNewsItem(
  post: NonNullable<NonNullable<NonNullable<RedditListing["data"]>["children"]>[number]["data"]>,
  subreddit: string,
  category: NewsCategory,
): NewsItem {
  const isExternal = !post.is_self && Boolean(post.url);
  return {
    externalId: `${subreddit}_${post.id}`,
    sourceId: REDDIT_SOURCE_ID,
    sourceLabel: `r/${subreddit}`,
    title: post.title ?? "",
    url: isExternal ? post.url : undefined,
    text: post.is_self ? post.selftext : undefined,
    excerpt: post.link_flair_text ?? undefined,
    author: post.author,
    score: post.ups,
    commentCount: post.num_comments,
    createdAt: post.created_utc ? new Date(post.created_utc * 1000) : new Date(),
    category,
  };
}

export interface RedditProviderOptions {
  subreddits?: string[];
  /** Category -> time window for the `top` sort (day, week, month, year, all). */
  topWindow?: string;
}

export function createRedditProvider(
  options: RedditProviderOptions = {},
): NewsProvider {
  const subreddits = options.subreddits ?? DEFAULT_SUBREDDITS;
  const topWindow = options.topWindow ?? "day";

  async function fetchListing(
    subreddit: string,
    category: NewsCategory,
    limit: number,
  ): Promise<NewsItem[]> {
    const sort = sortForCategory(category);
    const window = sort === "top" ? `&t=${topWindow}` : "";
    const listing = await fetchJson<RedditListing>(
      `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${sort}.json?limit=${limit}&raw_json=1${window}`,
      { headers: REDDIT_HEADERS },
    );

    return (listing?.data?.children ?? [])
      .map((child) => child.data)
      .filter(
        (post): post is NonNullable<typeof post> =>
          Boolean(post?.id && post?.title && !post.over_18 && !post.stickied),
      )
      .map((post) => toNewsItem(post, subreddit, category));
  }

  return {
    id: REDDIT_SOURCE_ID,
    displayName: REDDIT_DISPLAY_NAME,
    categories: REDDIT_CATEGORIES,

    async getStories(category, getOptions) {
      const limit = getOptions?.limit ?? 30;
      const perSubreddit = Math.max(1, Math.ceil(limit / subreddits.length));
      const results = await Promise.all(
        subreddits.map((subreddit) =>
          fetchListing(subreddit, category, perSubreddit),
        ),
      );
      return results
        .flat()
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, limit);
    },

    async getStory(externalId) {
      const [subreddit, id] = externalId.split("_");
      if (!subreddit || !id) return null;
      const listing = await fetchJson<RedditListing>(
        `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/comments/${id}.json?raw_json=1`,
        { headers: REDDIT_HEADERS },
      );
      const post = listing?.data?.children?.[0]?.data;
      return post?.id ? toNewsItem(post, subreddit, "top") : null;
    },

    async search(query, searchOptions) {
      const limit = searchOptions?.limit ?? 30;
      const listing = await fetchJson<RedditListing>(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=${limit}&raw_json=1`,
        { headers: REDDIT_HEADERS },
      );
      return (listing?.data?.children ?? [])
        .map((child) => child.data)
        .filter(
          (post): post is NonNullable<typeof post> =>
            Boolean(post?.id && post?.title && !post.over_18),
        )
        .map((post) =>
          toNewsItem(post, post.permalink?.split("/")[2] ?? "all", "top"),
        );
    },
  };
}
