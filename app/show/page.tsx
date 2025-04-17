import { Header } from "@/components/header"
import { StoryList } from "@/components/story-list"

export default function ShowPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-6">
        <StoryList type="show" />
      </main>
    </div>
  )
}
