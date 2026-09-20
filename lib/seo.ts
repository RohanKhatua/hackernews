import type { Keyword } from "@prisma/client";

export const SITE_NAME = "Hacker News - But Better";
export const SITE_DESCRIPTION =
  "A modern reader for the best of tech: top stories and discussions from Hacker News, Lobsters, DEV Community and leading tech publications.";

export function getSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  // Env values are often configured as a bare hostname (e.g. "example.com");
  // normalize so `new URL(getSiteUrl())` never throws.
  const withProtocol =
    raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
  return (withProtocol || "http://localhost:3000").replace(/\/+$/, "");
}

export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

/** Converts an HTML fragment (HN text, comments) into plain text. */
export function htmlToText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateDescription(value: string, max = 160): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

export function topicPath(keyword: Pick<Keyword, "slug"> | string): string {
  const slug = typeof keyword === "string" ? keyword : keyword.slug;
  return `/topics/${slug}`;
}

export function storyPath(article: { sourceId: string; externalId: string; slug: string }): string {
  return article.sourceId === "hackernews"
    ? `/item/${article.externalId}`
    : `/story/${article.slug}`;
}

interface JsonLdObject {
  [key: string]: unknown;
}

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: getSiteUrl(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getSiteUrl()}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: getSiteUrl(),
    logo: absoluteUrl("/icon"),
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function itemListJsonLd(
  name: string,
  items: { title: string; path: string }[],
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.title,
      url: absoluteUrl(item.path),
    })),
  };
}

export function discussionJsonLd(story: {
  title: string;
  path: string;
  author?: string;
  createdAt: number;
  score: number;
  commentCount: number;
  keywords?: string[];
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: story.title,
    name: story.title,
    url: absoluteUrl(story.path),
    datePublished: new Date(story.createdAt * 1000).toISOString(),
    author: story.author
      ? { "@type": "Person", name: story.author }
      : undefined,
    commentCount: story.commentCount,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: story.score,
    },
    keywords: story.keywords?.length ? story.keywords.join(", ") : undefined,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: getSiteUrl() },
  };
}

export function webPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    keywords: input.keywords?.length ? input.keywords.join(", ") : undefined,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: getSiteUrl() },
  };
}
