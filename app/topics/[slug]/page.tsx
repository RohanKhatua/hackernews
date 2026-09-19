import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { FeedList } from "@/components/feed-list";
import { JsonLd } from "@/components/json-ld";
import {
  MIN_TOPIC_ARTICLES,
  getRelatedTopics,
  getTopicBySlug,
} from "@/lib/data";
import { feedItemPath } from "@/lib/paths";
import {
  SITE_NAME,
  breadcrumbJsonLd,
  itemListJsonLd,
  truncateDescription,
  webPageJsonLd,
} from "@/lib/seo";

export const revalidate = 600;

const loadTopic = cache(async (slug: string) => getTopicBySlug(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await loadTopic(slug);

  if (!topic) {
    return { title: "Topic not found", robots: { index: false, follow: false } };
  }

  const term = topic.keyword.term;
  const title = `${term} — news & discussions`;
  const description = truncateDescription(
    `${topic.keyword.articleCount} stories and discussions about ${term} from Hacker News, Lobsters, Reddit, DEV Community and leading tech publications.`,
  );
  const path = `/topics/${topic.keyword.slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    keywords: [term],
    openGraph: {
      type: "website",
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await loadTopic(slug);

  // Guard against thin pages: a topic needs a minimum number of articles.
  if (!topic || topic.items.length < MIN_TOPIC_ARTICLES) notFound();

  const term = topic.keyword.term;
  const path = `/topics/${topic.keyword.slug}`;
  const related = await getRelatedTopics(topic.keyword.id, 12);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-6 px-4 sm:px-6">
        <JsonLd
          data={[
            webPageJsonLd({
              title: `${term} — news & discussions`,
              description: `Stories and discussions about ${term}.`,
              path,
              keywords: [term],
            }),
            itemListJsonLd(
              `${term} stories`,
              topic.items.map((item) => ({
                title: item.title,
                path: feedItemPath(item),
              })),
            ),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Topics", path: "/topics" },
              { name: term, path },
            ]),
          ]}
        />

        <div className="mb-6 border-b border-border/40 pb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold capitalize">
            {term}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {topic.keyword.articleCount} stories and discussions about {term},
            aggregated from every source we track.
          </p>
        </div>

        <FeedList items={topic.items} />

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-medium mb-3">Related topics</h2>
            <div className="flex flex-wrap gap-2">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/topics/${rel.slug}`}
                  className="rounded-full border border-border/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                >
                  {rel.term}
                  <span className="ml-1.5 text-xs opacity-60">
                    {rel.articleCount}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
