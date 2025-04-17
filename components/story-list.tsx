"use client"

import { useEffect, useState } from "react"
import { StoryItem } from "@/components/story-item"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface StoryListProps {
  type?: "top" | "new" | "best" | "ask" | "show" | "job"
  limit?: number
}

export function StoryList({ type = "top", limit = 30 }: StoryListProps) {
  const [storyIds, setStoryIds] = useState<number[]>([])
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const storiesPerPage = limit

  useEffect(() => {
    const fetchStoryIds = async () => {
      setLoading(true)
      try {
        const endpoint =
          type === "new"
            ? "newstories"
            : type === "best"
              ? "beststories"
              : type === "ask"
                ? "askstories"
                : type === "show"
                  ? "showstories"
                  : type === "job"
                    ? "jobstories"
                    : "topstories"

        const response = await fetch(`https://hacker-news.firebaseio.com/v0/${endpoint}.json`)
        const ids = await response.json()
        setStoryIds(ids)
        setPage(1)
      } catch (error) {
        console.error("Error fetching story IDs:", error)
      }
    }

    fetchStoryIds()
  }, [type])

  useEffect(() => {
    const fetchStories = async () => {
      if (storyIds.length === 0) return

      setLoading(true)
      const startIndex = (page - 1) * storiesPerPage
      const endIndex = startIndex + storiesPerPage
      const currentPageIds = storyIds.slice(startIndex, endIndex)

      try {
        const storyPromises = currentPageIds.map((id) =>
          fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((res) => res.json()),
        )

        const fetchedStories = await Promise.all(storyPromises)
        setStories(fetchedStories)
      } catch (error) {
        console.error("Error fetching stories:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStories()
  }, [storyIds, page, storiesPerPage])

  const handleNextPage = () => {
    if (page * storiesPerPage < storyIds.length) {
      setPage(page + 1)
      window.scrollTo(0, 0)
    }
  }

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1)
      window.scrollTo(0, 0)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="py-3 border-b border-border/40 last:border-0">
            <div className="flex items-start">
              <Skeleton className="h-4 w-6 mr-2" />
              <div className="flex-1">
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-0">
        {stories.map((story, index) => (
          <StoryItem
            key={story.id}
            id={story.id}
            title={story.title}
            url={story.url}
            score={story.score}
            by={story.by}
            time={story.time}
            descendants={story.descendants || 0}
            index={(page - 1) * storiesPerPage + index + 1}
          />
        ))}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handlePrevPage} disabled={page === 1} className="text-sm">
          Previous
        </Button>
        <span className="text-sm text-muted-foreground py-2">Page {page}</span>
        <Button
          variant="outline"
          onClick={handleNextPage}
          disabled={page * storiesPerPage >= storyIds.length}
          className="text-sm"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
