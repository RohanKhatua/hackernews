import { Header } from "@/components/header";
import { RecommendedStoryList } from "@/components/recommended-story-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recommended",
  description:
    "Personalized tech stories and discussions ranked from your reading history.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/recommended" },
};

const CLAIM_MESSAGES: Record<string, string> = {
  claimed:
    "This device's reading history is now linked to your subscription — it'll shape your recommended email from here on.",
  invalid:
    "That sync link is invalid or has already been used. Re-subscribe or check the latest welcome email.",
  "no-cookie":
    "Couldn't read this browser's identity cookie, so nothing was linked. Try opening the link again in a normal browsing session.",
};

export default async function RecommendedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const claimParam = typeof params.claim === "string" ? params.claim : undefined;
  const claimMessage = claimParam ? CLAIM_MESSAGES[claimParam] : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container max-w-4xl py-4 sm:py-6 px-4 sm:px-6">
        <div className="mb-4 border-b border-border/40 pb-3">
          <h1 className="text-2xl font-semibold">Recommended</h1>
          <p className="text-sm text-muted-foreground">
            Ranked from this browser&apos; reads, likes, authors, domains, and
            story topics.
          </p>
        </div>
        {claimMessage && (
          <p
            className={`mb-4 rounded-md border px-4 py-3 text-sm ${
              claimParam === "claimed"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {claimMessage}
          </p>
        )}
        <RecommendedStoryList />
      </main>
    </div>
  );
}
