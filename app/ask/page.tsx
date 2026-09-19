import type { Metadata } from "next";
import { Header } from "@/components/header";
import { StoryFeed } from "@/components/story-feed";
import { buildFeedMetadata } from "@/lib/feed-metadata";
import { parsePageParam } from "@/lib/paths";

export const revalidate = 300;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
	searchParams,
}: {
	searchParams: SearchParams;
}): Promise<Metadata> {
	const { page } = await searchParams;
	return buildFeedMetadata("ask", parsePageParam(page));
}

export default async function AskPage({
	searchParams,
}: {
	searchParams: SearchParams;
}) {
	const { page } = await searchParams;

	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<main className="flex-1 container max-w-4xl py-6">
				<StoryFeed category="ask" page={parsePageParam(page)} heading="Ask HN" />
			</main>
		</div>
	);
}
