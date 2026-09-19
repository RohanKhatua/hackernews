"use server";

import { prisma } from "@/lib/db";
import {
  fetchStories,
  fetchStoryIds,
  getStoryDomain,
  type HackerNewsStory,
} from "@/lib/hn";

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "from",
  "have",
  "into",
  "more",
  "over",
  "that",
  "the",
  "this",
  "with",
  "your",
  "show",
  "ask",
  "hn",
  "how",
  "why",
  "what",
  "when",
  "where",
  "new",
  "using",
]);

type WeightedProfile = {
  terms: Map<string, number>;
  domains: Map<string, number>;
  authors: Map<string, number>;
  seenStoryIds: Set<number>;
  dismissedStoryIds: Set<number>;
  /** Number of distinct stories behind the profile — drives cold start. */
  distinctStoryCount: number;
};

export type RecommendedStory = HackerNewsStory & {
  recommendationScore: number;
  recommendationReasons: string[];
};

/** Explicit, tunable signal weights for interaction types. */
const SIGNAL_WEIGHTS = {
  read: 2,
  like: 5,
  dismiss: -6,
} as const;

/** A profile with fewer distinct stories than this is treated as cold start. */
const COLD_START_MIN_STORIES = 5;

function tokenize(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function bump(
  map: Map<string, number>,
  key: string | null | undefined,
  amount: number,
) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + amount);
}

function interactionWeight(type: "read" | "like" | "dismiss") {
  if (type === "like") return SIGNAL_WEIGHTS.like;
  if (type === "dismiss") return SIGNAL_WEIGHTS.dismiss;
  return SIGNAL_WEIGHTS.read;
}

export async function recordStoryInteraction({
  readerId,
  story,
  type,
  subscriberId,
}: {
  readerId: string;
  story: HackerNewsStory;
  type: "read" | "like" | "dismiss";
  /** Optional: pins this reader to a subscriber at write time (email clicks). */
  subscriberId?: string;
}) {
  const domain = getStoryDomain(story.url);
  const weight = interactionWeight(type);

  // The Reader row must exist before the interaction insert (FK), so this
  // is sequenced, not parallel. Cheap primary-key upsert.
  const reader = await prisma.reader.upsert({
    where: { id: readerId },
    create: { id: readerId, subscriberId },
    update: subscriberId
      ? { subscriberId, lastSeenAt: new Date() }
      : { lastSeenAt: new Date() },
  });
  void reader;

  return prisma.storyInteraction.upsert({
    where: {
      readerId_storyId_type: {
        readerId,
        storyId: story.id,
        type,
      },
    },
    create: {
      readerId,
      storyId: story.id,
      type,
      weight,
      storyTitle: story.title,
      storyUrl: story.url,
      storyBy: story.by,
      storyScore: story.score,
      storyComments: story.descendants,
      storyTime: story.time,
      domain,
    },
    update: {
      count: { increment: 1 },
      weight,
      storyTitle: story.title,
      storyUrl: story.url,
      storyBy: story.by,
      storyScore: story.score,
      storyComments: story.descendants,
      storyTime: story.time,
      domain,
    },
  });
}

async function buildProfile({
  readerId,
  subscriberId,
}: {
  readerId?: string;
  subscriberId?: string;
}): Promise<WeightedProfile> {
  // A subscriber's profile spans every Reader linked to it — each browser
  // they've subscribed or claimed from, plus their synthetic email-click
  // reader (`email:<subscriberId>`).
  const readerIds = subscriberId
    ? (
        await prisma.reader.findMany({
          where: { subscriberId },
          select: { id: true },
        })
      ).map((reader) => reader.id)
    : readerId
      ? [readerId]
      : [];

  const interactions =
    readerIds.length > 0
      ? await prisma.storyInteraction.findMany({
          where: { readerId: { in: readerIds } },
          orderBy: { updatedAt: "desc" },
          take: 250,
        })
      : [];

  const profile: WeightedProfile = {
    terms: new Map(),
    domains: new Map(),
    authors: new Map(),
    seenStoryIds: new Set(),
    dismissedStoryIds: new Set(),
    distinctStoryCount: 0,
  };

  for (const interaction of interactions) {
    const recency = Math.max(
      0.15,
      1 -
        (Date.now() - interaction.updatedAt.getTime()) /
          (1000 * 60 * 60 * 24 * 45),
    );
    const amount = interaction.weight * interaction.count * recency;

    profile.seenStoryIds.add(interaction.storyId);
    if (interaction.type === "dismiss") {
      profile.dismissedStoryIds.add(interaction.storyId);
    }

    for (const term of tokenize(interaction.storyTitle)) {
      bump(profile.terms, term, amount);
    }

    bump(profile.domains, interaction.domain, amount * 1.4);
    bump(profile.authors, interaction.storyBy, amount);
  }

  profile.distinctStoryCount = profile.seenStoryIds.size;

  return profile;
}

function topMatches(map: Map<string, number>, values: string[]) {
  return values
    .map((value) => ({ value, score: map.get(value) ?? 0 }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

/** Raw HN momentum: the popularity part of the score. */
function momentumScore(story: HackerNewsStory) {
  const hnScore = Math.log10((story.score ?? 0) + 10) * 1.8;
  const commentScore = Math.log10((story.descendants ?? 0) + 10);
  const ageHours = story.time ? (Date.now() / 1000 - story.time) / 3600 : 72;
  const freshness = Math.max(0, 3 - ageHours / 18);

  return hnScore + commentScore + freshness;
}

function scoreStory(story: HackerNewsStory, profile: WeightedProfile, coldStart: boolean) {
  const domain = getStoryDomain(story.url);
  const terms = tokenize(story.title);
  const termScore = terms.reduce(
    (total, term) => total + (profile.terms.get(term) ?? 0),
    0,
  );
  const domainScore = domain ? (profile.domains.get(domain) ?? 0) : 0;
  const authorScore = story.by ? (profile.authors.get(story.by) ?? 0) : 0;
  const seenPenalty = profile.seenStoryIds.has(story.id) ? 8 : 0;

  const personalScore =
    termScore * 0.45 + domainScore * 0.8 + authorScore * 0.5;
  const momentum = momentumScore(story);

  // Cold start: not enough signal to trust personalization, so blend it
  // evenly with popularity instead of letting term scores swing the list.
  return coldStart
    ? (personalScore + momentum) / 2 - seenPenalty
    : personalScore + momentum - seenPenalty;
}

function recommendationReasons(
  story: HackerNewsStory,
  profile: WeightedProfile,
) {
  const domain = getStoryDomain(story.url);
  const termMatches = topMatches(profile.terms, tokenize(story.title)).map(
    (match) => match.value,
  );
  const reasons = [];

  if (domain && (profile.domains.get(domain) ?? 0) > 0) {
    reasons.push(`more from ${domain}`);
  }

  if (story.by && (profile.authors.get(story.by) ?? 0) > 0) {
    reasons.push(`you read ${story.by}`);
  }

  if (termMatches.length > 0) {
    reasons.push(`matches ${termMatches.join(", ")}`);
  }

  if (reasons.length === 0) {
    reasons.push("strong HN momentum");
  }

  return reasons.slice(0, 2);
}

export async function getRecommendedStories({
  readerId,
  subscriberId,
  limit = 10,
}: {
  readerId?: string;
  subscriberId?: string;
  limit?: number;
}): Promise<{ stories: RecommendedStory[]; coldStart: boolean }> {
  const profile = await buildProfile({ readerId, subscriberId });
  const coldStart = profile.distinctStoryCount < COLD_START_MIN_STORIES;
  const [topIds, bestIds, newIds, showIds, askIds] = await Promise.all([
    fetchStoryIds("top"),
    fetchStoryIds("best"),
    fetchStoryIds("new"),
    fetchStoryIds("show"),
    fetchStoryIds("ask"),
  ]);
  const candidateIds = Array.from(
    new Set([
      ...topIds.slice(0, 80),
      ...bestIds.slice(0, 80),
      ...newIds.slice(0, 80),
      ...showIds.slice(0, 40),
      ...askIds.slice(0, 40),
    ]),
  );
  const stories = await fetchStories(candidateIds);

  const ranked = stories
    .filter((story) => !profile.dismissedStoryIds.has(story.id))
    .map((story) => ({
      ...story,
      recommendationScore: scoreStory(story, profile, coldStart),
      recommendationReasons: recommendationReasons(story, profile),
    }))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);

  return { stories: ranked, coldStart };
}

export async function getRecommendedStoriesForEmail(email: string, limit = 5) {
  const subscriber = await prisma.subscriber.findUnique({ where: { email } });

  if (!subscriber) {
    const ids = await fetchStoryIds("top");
    const stories = await fetchStories(ids.slice(0, limit));
    return stories.map((story) => ({
      ...story,
      recommendationScore: story.score ?? 0,
      recommendationReasons: ["top HN story"],
    }));
  }

  const { stories } = await getRecommendedStories({
    subscriberId: subscriber.id,
    limit,
  });
  return stories;
}
