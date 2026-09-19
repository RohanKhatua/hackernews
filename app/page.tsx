import type { Metadata } from "next";
import { Header } from "@/components/header";
import { NewsletterForm } from "@/components/newsletter-form";
import { StoryFeed } from "@/components/story-feed";
import { buildFeedMetadata } from "@/lib/feed-metadata";
import { parsePageParam } from "@/lib/paths";
import { SITE_NAME } from "@/lib/seo";

export const revalidate = 300;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
	searchParams,
}: {
	searchParams: SearchParams;
}): Promise<Metadata> {
	const { page } = await searchParams;
	const currentPage = parsePageParam(page);
	// The root layout's title template does not apply to this segment, so the
	// site name is added here explicitly.
	const label =
		currentPage > 1 ? `Top stories — Page ${currentPage}` : "Top stories";

	return {
		...buildFeedMetadata("top", currentPage),
		title: { absolute: `${label} | ${SITE_NAME}` },
	};
}

export default async function Home({
	searchParams,
}: {
	searchParams: SearchParams;
}) {
	const { page } = await searchParams;

	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<main className="flex-1 container max-w-4xl py-4 sm:py-6 px-4 sm:px-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="md:col-span-2">
						<StoryFeed category="top" page={parsePageParam(page)} heading="Top stories" />
					</div>
					<div className="md:col-span-1">
						<NewsletterForm />
					</div>
				</div>
			</main>
		</div>
	);
}
