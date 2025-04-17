"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

export default function UserPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/user/${params.id}.json`)
        const data = await response.json()
        setUser(data)
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [params.id])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-4 sm:py-6 px-4 sm:px-6">
        {loading ? (
          <div>
            <Skeleton className="h-8 w-1/3 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/4 mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
          </div>
        ) : user ? (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-4">{user.id}</h1>
            <div className="space-y-2 mb-6">
              <p className="text-sm">
                <span className="text-muted-foreground">Created:</span>{" "}
                {formatDistanceToNow(new Date(user.created * 1000), { addSuffix: true })}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Karma:</span> {user.karma}
              </p>
              {user.about && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">About:</p>
                  <div
                    className="text-sm p-3 sm:p-4 bg-secondary rounded-md prose prose-invert max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: user.about }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">User not found.</p>
        )}
      </main>
    </div>
  )
}
