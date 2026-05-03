import { Header } from "@/components/header";
import { RecommendedStoryList } from "@/components/recommended-story-list";

export default function RecommendedPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-4 sm:py-6 px-4 sm:px-6">
        <div className="mb-4 border-b border-border/40 pb-3">
          <h1 className="text-2xl font-semibold">Recommended</h1>
          <p className="text-sm text-muted-foreground">
            Ranked from this browser's reads, likes, authors, domains, and story
            topics.
          </p>
        </div>
        <RecommendedStoryList />
      </main>
    </div>
  );
}
