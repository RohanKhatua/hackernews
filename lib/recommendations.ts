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

type InteractionInput = {
  readerId: string;
  subscriberId?: string;
  userId?: string;
  story: HackerNewsStory;
  type: "read" | "like" | "dismiss";
};

type WeightedProfile = {
  terms: Map<string, number>;
  domains: Map<string, number>;
  authors: Map<string, number>;
  seenStoryIds: Set<number>;
  dismissedStoryIds: Set<number>;
};

export type RecommendedStory = HackerNewsStory & {
  recommendationScore: number;
  recommendationReasons: string[];
};

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

function interactionWeight(type: InteractionInput["type"]) {
  if (type === "like") return 5;
  if (type === "dismiss") return -6;
  return 2;
}

export async function recordStoryInteraction({
  readerId,
  subscriberId,
  userId,
  story,
  type,
}: InteractionInput) {
  const domain = getStoryDomain(story.url);
  const weight = interactionWeight(type);

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
      subscriberId,
      userId,
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
      subscriberId,
      userId,
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
  userId,
}: {
  readerId?: string;
  subscriberId?: string;
  userId?: string;
}): Promise<WeightedProfile> {
  const interactions = await prisma.storyInteraction.findMany({
    where: {
      OR: [
        ...(readerId ? [{ readerId }] : []),
        ...(subscriberId ? [{ subscriberId }] : []),
        ...(userId ? [{ userId }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 250,
  });

  const profile: WeightedProfile = {
    terms: new Map(),
    domains: new Map(),
    authors: new Map(),
    seenStoryIds: new Set(),
    dismissedStoryIds: new Set(),
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

  return profile;
}

function topMatches(map: Map<string, number>, values: string[]) {
  return values
    .map((value) => ({ value, score: map.get(value) ?? 0 }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

function scoreStory(story: HackerNewsStory, profile: WeightedProfile) {
  const domain = getStoryDomain(story.url);
  const terms = tokenize(story.title);
  const termScore = terms.reduce(
    (total, term) => total + (profile.terms.get(term) ?? 0),
    0,
  );
  const domainScore = domain ? (profile.domains.get(domain) ?? 0) : 0;
  const authorScore = story.by ? (profile.authors.get(story.by) ?? 0) : 0;
  const hnScore = Math.log10((story.score ?? 0) + 10) * 1.8;
  const commentScore = Math.log10((story.descendants ?? 0) + 10);
  const ageHours = story.time ? (Date.now() / 1000 - story.time) / 3600 : 72;
  const freshness = Math.max(0, 3 - ageHours / 18);
  const seenPenalty = profile.seenStoryIds.has(story.id) ? 8 : 0;

  return (
    termScore * 0.45 +
    domainScore * 0.8 +
    authorScore * 0.5 +
    hnScore +
    commentScore +
    freshness -
    seenPenalty
  );
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
  userId,
  limit = 10,
}: {
  readerId?: string;
  subscriberId?: string;
  userId?: string;
  limit?: number;
}) {
  const profile = await buildProfile({ readerId, subscriberId, userId });
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

  return stories
    .filter((story) => !profile.dismissedStoryIds.has(story.id))
    .map((story) => ({
      ...story,
      recommendationScore: scoreStory(story, profile),
      recommendationReasons: recommendationReasons(story, profile),
    }))
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
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

  return getRecommendedStories({ subscriberId: subscriber.id, limit });
}
