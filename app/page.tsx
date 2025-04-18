import { Header } from "@/components/header";
import { NewsletterForm } from "@/components/newsletter-form";
import { StoryList } from "@/components/story-list";

export default function Home() {
	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<main className="flex-1 container max-w-4xl py-4 sm:py-6 px-4 sm:px-6">
				<StoryList type="top" />
				<NewsletterForm />
			</main>
		</div>
	);
}
