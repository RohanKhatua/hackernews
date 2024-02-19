import ArticleList from "@/components/article-list";
import BackgroundBeams from "@/components/ui/background-beams";
export default async function Home() {

  return (
    <div>
      <main className="flex min-h-screen flex-col items-center p-16">
        <div className="text-7xl font-light text-primary">
          Hacker News - But Better
        </div>
        <ArticleList />
      </main>
      <BackgroundBeams className="-z-10"></BackgroundBeams>
    </div>
  );
}
