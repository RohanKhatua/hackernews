"use client"

import type React from "react"

import { useState } from "react"
import { Header } from "@/components/header"
import { SearchResults } from "@/components/search-results"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchIcon, Loader2 } from "lucide-react"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState("stories")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setIsSearching(true)
      setSearchQuery(query.trim())
      // The actual search is performed in the SearchResults component
      setTimeout(() => setIsSearching(false), 100) // Just to show loading state briefly
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-4 sm:py-6 px-4 sm:px-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Search Hacker News</h1>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <Input
            type="search"
            placeholder="Search stories and comments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching || !query.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SearchIcon className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">Search</span>
          </Button>
        </form>

        {searchQuery && (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Search results for: <span className="font-medium text-foreground">{searchQuery}</span>
              </p>
            </div>

            <Tabs defaultValue="stories" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 w-full sm:w-auto">
                <TabsTrigger value="stories" className="flex-1 sm:flex-initial">
                  Stories
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex-1 sm:flex-initial">
                  Comments
                </TabsTrigger>
              </TabsList>
              <TabsContent value="stories">
                <SearchResults query={searchQuery} type="stories" key={`stories-${searchQuery}`} />
              </TabsContent>
              <TabsContent value="comments">
                <SearchResults query={searchQuery} type="comments" key={`comments-${searchQuery}`} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  )
}
