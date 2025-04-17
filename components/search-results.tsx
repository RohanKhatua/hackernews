"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

interface SearchResultsProps {
  query: string
  type: "stories" | "comments"
}

export function SearchResults({ query, type }: SearchResultsProps) {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) return

      setLoading(true)
      setError(null)

      try {
        // Use Algolia's Hacker News API for search
        const endpoint =
          type === "stories"
            ? `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&page=${page}&hitsPerPage=20`
            : `https://hn.algolia.com/api/v1/search_by_date?tags=comment&query=${encodeURIComponent(query)}&page=${page}&hitsPerPage=20`

        const response = await fetch(endpoint)

        if (!response.ok) {
          throw new Error("Failed to fetch search results")
        }

        const data = await response.json()

        if (page === 0) {
          setResults(data.hits)
        } else {
          setResults((prev) => [...prev, ...data.hits])
        }

        setHasMore(data.hits.length === 20 && page < data.nbPages - 1)
      } catch (err) {
        console.error("Search error:", err)
        setError("An error occurred while searching. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query, type, page])

  const loadMore = () => {
    setPage((prev) => prev + 1)
  }

  if (error) {
    return <div className="text-destructive py-4">{error}</div>
  }

  if (loading && page === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-3 border-b border-border/40 last:border-0">
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (results.length === 0 && !loading) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">
          No {type} found for "{query}"
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-0">
        {results.map((item) =>
          type === "stories" ? (
            <StoryResult key={item.objectID} item={item} />
          ) : (
            <CommentResult key={item.objectID} item={item} />
          ),
        )}
      </div>

      {loading && page > 0 && (
        <div className="py-4 text-center">
          <Skeleton className="h-10 w-32 mx-auto" />
        </div>
      )}

      {hasMore && !loading && (
        <div className="py-4 text-center">
          <Button variant="outline" onClick={loadMore}>
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}

interface StoryResultProps {
  item: any
}

function StoryResult({ item }: StoryResultProps) {
  const domain = item.url ? new URL(item.url).hostname.replace(/^www\./, "") : null
  const formattedTime = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : "unknown time"

  return (
    <div className="py-3 border-b border-border/40 last:border-0">
      <div className="flex items-start">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={item.url || `/item/${item.objectID}`}
              className="text-foreground font-medium story-link text-sm sm:text-base break-words"
              target={item.url ? "_blank" : undefined}
              rel={item.url ? "noopener noreferrer" : undefined}
            >
              {item.title || "Untitled"}
            </Link>
            {item.url && (
              <Link
                href={item.url}
                className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">{domain}</span>
              </Link>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center">
            <span>{item.points || 0} points</span>
            <span className="mx-1">•</span>
            <Link href={`/user/${item.author}`} className="hover:text-primary">
              {item.author}
            </Link>
            <span className="mx-1">•</span>
            <span>{formattedTime}</span>
            <span className="mx-1">•</span>
            <Link href={`/item/${item.objectID}`} className="hover:text-primary">
              {item.num_comments || 0} {item.num_comments === 1 ? "comment" : "comments"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CommentResultProps {
  item: any
}

function CommentResult({ item }: CommentResultProps) {
  const formattedTime = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : "unknown time"

  // Extract a snippet of the comment text
  const commentText = item.comment_text || ""
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ""
  }
  const plainText = stripHtml(commentText)
  const snippet = plainText.length > 200 ? plainText.substring(0, 200) + "..." : plainText

  return (
    <div className="py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Link href={`/user/${item.author}`} className="text-sm font-medium hover:text-primary">
            {item.author}
          </Link>
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
          <span className="text-xs text-muted-foreground">on:</span>
          <Link
            href={`/item/${item.story_id}`}
            className="text-xs font-medium hover:text-primary truncate max-w-[180px] sm:max-w-none"
          >
            {item.story_title || "Untitled Story"}
          </Link>
        </div>
        <div className="text-sm text-muted-foreground mb-1 break-words">{snippet}</div>
        <Link href={`/item/${item.story_id}`} className="text-xs text-primary hover:underline">
          View full discussion
        </Link>
      </div>
    </div>
  )
}
