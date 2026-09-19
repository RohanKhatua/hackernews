import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Header } from "@/components/header";
import { KeywordChips } from "@/components/keyword-chips";
import { RelatedStories } from "@/components/related-stories";
import { JsonLd } from "@/components/json-ld";
import { getArticleDetail, getRelatedTopics } from "@/lib/data";
import {
  SITE_NAME,
  breadcrumbJsonLd,
  htmlToText,
  truncateDescription,
  webPageJsonLd,
} from "@/lib/seo";

export const revalidate = 600;

const loadArticle = cache(async (slug: string) => getArticleDetail(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(slug);

  if (!article) {
    return { title: "Story not found", robots: { index: false, follow: false } };
  }

  const rawDescription =
    article.excerpt ?? (article.text ? htmlToText(article.text) : "");
  const description = truncateDescription(
    rawDescription ||
      `${article.title} — ${article.sourceLabel ?? "tech news"} on ${SITE_NAME}.`,
  );
  // HN stories canonicalize to their discussion page.
  const canonical =
    article.sourceId === "hackernews"
      ? `/item/${article.externalId}`
      : `/story/${article.slug}`;

  return {
    title: article.title,
    description,
    alternates: { canonical },
    keywords: article.keywords.map((keyword) => keyword.term),
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url: `/story/${article.slug}`,
      siteName: SITE_NAME,
      publishedTime: article.publishedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await loadArticle(slug);

  if (!article) notFound();
  // Keep one canonical page per HN story: its discussion page.
  if (article.sourceId === "hackernews") redirect(`/item/${article.externalId}`);

  const relatedTopics = article.primaryKeywordId
    ? await getRelatedTopics(article.primaryKeywordId, 12)
    : [];

  const path = `/story/${article.slug}`;
  const formattedTime = formatDistanceToNow(article.publishedAt, {
    addSuffix: true,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-3xl py-4 sm:py-6 px-4 sm:px-6 overflow-x-hidden">
        <JsonLd
          data={[
            webPageJsonLd({
              title: article.title,
              description: article.excerpt ?? article.title,
              path,
              keywords: article.keywords.map((keyword) => keyword.term),
            }),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              {
                name: article.sourceLabel ?? "Stories",
                path: `/topics`,
              },
              { name: article.title, path },
            ]),
          ]}
        />

        <h1 className="text-2xl sm:text-3xl font-semibold break-words">
          {article.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {article.sourceLabel && <span>{article.sourceLabel}</span>}
          <span>·</span>
          <span>{article.score} points</span>
          {article.author && (
            <>
              <span>·</span>
              <span>{article.author}</span>
            </>
          )}
          <span>·</span>
          <span>{formattedTime}</span>
          {article.domain && (
            <>
              <span>·</span>
              <span>{article.domain}</span>
            </>
          )}
        </div>

        {article.excerpt && (
          <p className="mt-4 text-base text-muted-foreground">{article.excerpt}</p>
        )}

        {article.text && (
          <div
            className="mt-4 prose prose-invert max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: article.text }}
          />
        )}

        {article.url && (
          <p className="mt-4 text-sm">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Read the full article
              {article.domain ? ` at ${article.domain}` : ""} →
            </a>
          </p>
        )}

        <KeywordChips keywords={article.keywords} className="mt-6" />

        <RelatedStories items={article.related} />

        {relatedTopics.length > 0 && (
          <section className="mt-8 sm:mt-10">
            <h2 className="text-lg font-medium mb-3">Related topics</h2>
            <div className="flex flex-wrap gap-2">
              {relatedTopics.map((topic) => (
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
          </section>
        )}
      </main>
    </div>
  );
}
