import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { JsonLd } from "@/components/json-ld";
import { MIN_TOPIC_ARTICLES, getTopTopics } from "@/lib/data";
import { SITE_DESCRIPTION, SITE_NAME, itemListJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Topics",
  description:
    "Browse tech topics and keywords drawn from the stories we track — from Rust and Next.js to large language models and databases.",
  alternates: { canonical: "/topics" },
  openGraph: {
    type: "website",
    title: `Topics | ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: "/topics",
    siteName: SITE_NAME,
  },
};

export default async function TopicsPage() {
  const topics = await getTopTopics(300, MIN_TOPIC_ARTICLES);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-6 px-4 sm:px-6">
        <JsonLd
          data={itemListJsonLd(
            "Tech topics",
            topics.map((topic) => ({
              title: topic.term,
              path: `/topics/${topic.slug}`,
            })),
          )}
        />

        <div className="mb-6 border-b border-border/40 pb-4">
          <h1 className="text-2xl font-semibold">Topics</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keywords extracted from the stories and discussions we track. Each
            topic collects every article that mentions it.
          </p>
        </div>

        {topics.length === 0 ? (
          <p className="text-muted-foreground">
            No topics yet. They appear as stories are ingested.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/topics/${topic.slug}`}
                className="rounded-full border border-border/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
              >
                {topic.term}
                <span className="ml-1.5 text-xs opacity-60">
                  {topic.articleCount}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
