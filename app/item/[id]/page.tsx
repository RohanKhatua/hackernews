import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/header";
import { StoryItem } from "@/components/story-item";
import { CommentThread } from "@/components/comment-thread";
import { ReadTracker } from "@/components/read-tracker";
import { KeywordChips } from "@/components/keyword-chips";
import { RelatedStories } from "@/components/related-stories";
import { JsonLd } from "@/components/json-ld";
import { addExcerpts } from "@/lib/excerpts";
import { fetchStory } from "@/lib/hn";
import { fetchCommentTree } from "@/lib/comments";
import { getArticleBySource, getRelatedArticles } from "@/lib/data";
import {
  SITE_NAME,
  breadcrumbJsonLd,
  discussionJsonLd,
  htmlToText,
  truncateDescription,
} from "@/lib/seo";

export const revalidate = 300;

/**
 * Shared loader so generateMetadata and the page render don't double-fetch.
 * `cache` dedupes within a single request.
 */
const loadStory = cache(async (id: number) => {
  const story = await fetchStory(id);
  if (!story?.id || !story.title) return null;

  const [enriched] = await addExcerpts([story]);
  const article = await getArticleBySource("hackernews", String(id));
  return { story: enriched, article };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await loadStory(Number(id));

  if (!data) {
    return { title: "Story not found", robots: { index: false, follow: false } };
  }

  const { story, article } = data;
  const rawDescription =
    story.excerpt ?? (story.text ? htmlToText(story.text) : "");
  const description = truncateDescription(
    rawDescription ||
      `Discussion and comments on "${story.title}" on ${SITE_NAME}.`,
  );
  const path = `/item/${id}`;
  const keywords = article?.keywords.map((link) => link.keyword.term);

  return {
    title: story.title,
    description,
    alternates: { canonical: path },
    keywords,
    openGraph: {
      type: "article",
      title: story.title,
      description,
      url: path,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: story.title,
      description,
    },
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const data = await loadStory(numericId);
  if (!data) notFound();

  const { story, article } = data;

  const [comments, related] = await Promise.all([
    fetchCommentTree(story.kids ?? []),
    article ? getRelatedArticles(article.id) : Promise.resolve([]),
  ]);

  const keywords =
    article?.keywords.map((link) => ({
      term: link.keyword.term,
      slug: link.keyword.slug,
    })) ?? [];

  const path = `/item/${story.id}`;
  const commentCount = story.descendants ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-4 sm:py-6 px-4 sm:px-6 overflow-x-hidden">
        <ReadTracker
          story={{
            id: story.id,
            title: story.title,
            url: story.url,
            score: story.score,
            by: story.by,
            time: story.time,
            descendants: story.descendants,
          }}
        />
        <JsonLd
          data={[
            discussionJsonLd({
              title: story.title,
              path,
              author: story.by,
              createdAt: story.time ?? 0,
              score: story.score ?? 0,
              commentCount,
              keywords: keywords.map((keyword) => keyword.term),
            }),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: story.title, path },
            ]),
          ]}
        />

        <StoryItem
          id={story.id}
          title={story.title}
          url={story.url}
          score={story.score || 0}
          by={story.by || "unknown"}
          time={story.time || 0}
          descendants={commentCount}
          excerpt={story.excerpt}
        />

        <KeywordChips keywords={keywords} className="mt-3" />

        {story.text && (
          <div
            className="mt-4 p-3 sm:p-4 bg-secondary rounded-md prose prose-invert max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: story.text }}
          />
        )}

        <h2 className="text-lg font-medium mt-6 sm:mt-8 mb-4">
          {commentCount} {commentCount === 1 ? "comment" : "comments"}
        </h2>

        {comments.length > 0 ? (
          <CommentThread comments={comments} />
        ) : (
          <p className="text-muted-foreground">No comments yet.</p>
        )}

        {(story.kids?.length ?? 0) > 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            <a
              href={`https://news.ycombinator.com/item?id=${story.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              Read the full thread on Hacker News →
            </a>
          </p>
        )}

        <RelatedStories items={related} />
      </main>
    </div>
  );
}
