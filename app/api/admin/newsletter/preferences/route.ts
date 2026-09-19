import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { getRecommendedStories } from "@/lib/recommendations";

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        confirmedAt: true,
        createdAt: true,
        readers: {
          select: {
            id: true,
            createdAt: true,
            lastSeenAt: true,
            interactions: {
              select: {
                id: true,
                storyId: true,
                type: true,
                storyTitle: true,
                storyBy: true,
                storyScore: true,
                domain: true,
                updatedAt: true,
              },
              orderBy: { updatedAt: "desc" },
              take: 15,
            },
          },
          orderBy: { lastSeenAt: "desc" },
        },
      },
    });

    const summaries = await Promise.all(
      subscribers.map(async (subscriber) => {
        const readerIds = subscriber.readers.map((reader) => reader.id);
        const interactionCount = subscriber.readers.reduce(
          (total, reader) => total + reader.interactions.length,
          0,
        );
        const distinctStories = new Set(
          subscriber.readers.flatMap((reader) =>
            reader.interactions.map((interaction) => interaction.storyId),
          ),
        ).size;

        const recommendation = await getRecommendedStories({
          subscriberId: subscriber.id,
          limit: 5,
        });

        const topDomains = tallyTop(
          subscriber.readers.flatMap((reader) =>
            reader.interactions.map((interaction) => interaction.domain).filter(Boolean),
          ) as string[],
        );
        const topAuthors = tallyTop(
          subscriber.readers.flatMap((reader) =>
            reader.interactions.map((interaction) => interaction.storyBy).filter(Boolean),
          ) as string[],
        );

        return {
          ...subscriber,
          readerCount: subscriber.readers.length,
          readerIds,
          interactionCount,
          distinctStories,
          topDomains,
          topAuthors,
          coldStart: recommendation.coldStart,
          recommendationReasons: recommendation.stories[0]?.recommendationReasons ?? [],
          recommendationSample: recommendation.stories.slice(0, 5).map((story) => ({
            id: story.id,
            title: story.title,
            score: story.score ?? 0,
            reasons: story.recommendationReasons,
          })),
        };
      }),
    );

    return NextResponse.json({ success: true, preferences: summaries });
  } catch (error) {
    console.error("Error fetching subscriber preferences:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscriber preferences" },
      { status: 500 },
    );
  }
}

function tallyTop(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({ value, count }));
}
