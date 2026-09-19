import type { MetadataRoute } from "next";
import { getRecentArticleSlugs, getTopTopics } from "@/lib/data";
import { getSiteUrl, storyPath } from "@/lib/seo";

export const revalidate = 3600;

const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/best", priority: 0.8 },
  { path: "/newest", priority: 0.8 },
  { path: "/ask", priority: 0.7 },
  { path: "/show", priority: 0.7 },
  { path: "/jobs", priority: 0.6 },
  { path: "/topics", priority: 0.6 },
];

const MAX_ARTICLES = 5000;
const MAX_TOPICS = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: "hourly",
    priority: route.priority,
  }));

  const [articles, topics] = await Promise.all([
    getRecentArticleSlugs(MAX_ARTICLES),
    getTopTopics(MAX_TOPICS),
  ]);

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${base}${storyPath(article)}`,
    lastModified: article.publishedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const topicEntries: MetadataRoute.Sitemap = topics.map((topic) => ({
    url: `${base}/topics/${topic.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticEntries, ...articleEntries, ...topicEntries];
}
