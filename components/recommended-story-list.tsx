"use client";

import { useEffect, useState } from "react";
import { StoryItem } from "@/components/story-item";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [coldStart, setColdStart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        // Identity comes from the reader cookie set by middleware.
        const response = await fetch("/api/recommendations");

        if (!response.ok) {
          throw new Error("Failed to load recommendations");
        }

        const data = await response.json();
        setStories(data.stories ?? []);
        setColdStart(Boolean(data.coldStart));
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

  const handleDismiss = (storyId: number) => {
    setStories((prev) => prev.filter((story) => story.id !== storyId));
  };

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
      {coldStart && (
        <p className="pb-3 text-xs text-muted-foreground">
          Popular today — this list gets personal as you read, like, or dismiss
          more stories.
        </p>
      )}
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
            onDismiss={handleDismiss}
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
