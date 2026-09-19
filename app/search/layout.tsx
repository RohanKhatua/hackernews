import type { Metadata } from "next";

/**
 * Search result pages are useful to people but thin/duplicative for search
 * engines, so they are noindexed while still following links.
 */
export const metadata: Metadata = {
  title: "Search",
  description: "Search tech stories and discussions.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
