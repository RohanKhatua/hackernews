"use client";

import { useEffect, useState } from "react";
import { StoryItem } from "@/components/story-item";
import { Skeleton } from "@/components/ui/skeleton";
import { getReaderId } from "@/lib/reader-id";

type RecommendedStory = {
  id: number;
  title: string;
  url?: string;
  score?: number;
  by?: string;
  time?: number;
  descendants?: number;
  recommendationReasons?: string[];
};

export function RecommendedStoryList() {
  const [stories, setStories] = useState<RecommendedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        const readerId = getReaderId();

        if (!readerId) {
          setError(
            "Read or like a few stories to start your recommendation history.",
          );
          return;
        }

        const response = await fetch(
          `/api/recommendations?readerId=${encodeURIComponent(readerId)}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load recommendations");
        }

        const data = await response.json();
        setStories(data.stories ?? []);
      } catch (error) {
        console.error("Error loading recommendations:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load recommendations",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="py-3 border-b border-border/40 last:border-0">
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Read or like a few stories and recommendations will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {stories.map((story, index) => (
        <div key={story.id}>
          <StoryItem
            id={story.id}
            title={story.title}
            url={story.url}
            score={story.score ?? 0}
            by={story.by ?? "unknown"}
            time={story.time ?? Math.floor(Date.now() / 1000)}
            descendants={story.descendants ?? 0}
            index={index + 1}
          />
          {story.recommendationReasons &&
            story.recommendationReasons.length > 0 && (
              <p className="ml-8 -mt-2 pb-3 text-xs text-muted-foreground">
                Recommended because {story.recommendationReasons.join(" and ")}.
              </p>
            )}
        </div>
      ))}
    </div>
  );
}
