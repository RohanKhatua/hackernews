"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { StoryItem } from "@/components/story-item"
import { Comment } from "@/components/comment"
import { Skeleton } from "@/components/ui/skeleton"

export default function ItemPage({ params }: { params: { id: string } }) {
  const [story, setStory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${params.id}.json`)
        const data = await response.json()
        setStory(data)
      } catch (error) {
        console.error("Error fetching story:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStory()
  }, [params.id])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-4 sm:py-6 px-4 sm:px-6">
        {loading ? (
          <div>
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="pl-4 border-l border-border/40 mt-4">
                  <Skeleton className="h-4 w-1/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        ) : story ? (
          <div>
            <StoryItem
              id={story.id}
              title={story.title}
              url={story.url}
              score={story.score}
              by={story.by}
              time={story.time}
              descendants={story.descendants || 0}
            />

            {story.text && (
              <div
                className="mt-4 p-3 sm:p-4 bg-secondary rounded-md prose prose-invert max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: story.text }}
              />
            )}

            <h2 className="text-lg font-medium mt-6 sm:mt-8 mb-4">
              {story.descendants || 0} {story.descendants === 1 ? "comment" : "comments"}
            </h2>

            {story.kids && story.kids.length > 0 ? (
              <div>
                {story.kids.map((kidId: number) => (
                  <Comment key={kidId} id={kidId} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No comments yet.</p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">Story not found.</p>
        )}
      </main>
    </div>
  )
}
