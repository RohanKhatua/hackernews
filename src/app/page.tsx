import ArticleList from "@/components/article-list";
export default async function Home() {

  return (
    <main className="flex min-h-screen flex-col items-center p-16">
      <div className="text-7xl font-light text-primary">
        Hacker News - But Better
      </div>
      <ArticleList />
    </main>
  );
}
