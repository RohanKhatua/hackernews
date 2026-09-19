import type { Metadata } from "next";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  feedPageHref,
} from "@/lib/paths";
import { SITE_NAME } from "@/lib/seo";
import type { NewsCategory } from "@/lib/sources/types";

/** Shared metadata (title/description/canonical/OG) for a category feed page. */
export function buildFeedMetadata(
  category: NewsCategory,
  page: number,
): Metadata {
  const title = CATEGORY_LABELS[category];
  const description = CATEGORY_DESCRIPTIONS[category];
  const path = feedPageHref(category, page);
  const paginatedTitle = page > 1 ? `${title} — Page ${page}` : title;

  return {
    title: paginatedTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title: `${paginatedTitle} | ${SITE_NAME}`,
      description,
      url: path,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `${paginatedTitle} | ${SITE_NAME}`,
      description,
    },
  };
}
