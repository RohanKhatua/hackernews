import { Header } from "@/components/header";
import { NewsletterForm } from "@/components/newsletter-form";
import { StoryList } from "@/components/story-list";

export default function Home() {
	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<main className="flex-1 container max-w-4xl py-4 sm:py-6 px-4 sm:px-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="md:col-span-2">
						<StoryList type="top" />
					</div>
					<div className="md:col-span-1">
						<NewsletterForm />
					</div>
				</div>
			</main>
		</div>
	);
}
