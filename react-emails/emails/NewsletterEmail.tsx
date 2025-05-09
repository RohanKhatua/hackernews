import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Section,
	Text,
	Hr,
	Font,
	Tailwind,
} from "@react-email/components";

interface Story {
	id: number;
	title: string;
	url?: string;
	score: number;
	by: string;
	descendants: number;
}

interface NewsletterEmailProps {
	stories: Story[];
	date: string;
}

export const NewsletterEmail = ({ stories, date }: NewsletterEmailProps) => {
	return (
		<Tailwind>
			<Html>
				<Head>
					<Font
						fontFamily="Inter"
						fallbackFontFamily="Arial"
						webFont={{
							url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
							format: "woff2",
						}}
						fontWeight={400}
						fontStyle="normal"
					/>
				</Head>
				<Preview>Hacker News Daily Top 5 • {date}</Preview>
				<Body className="bg-gray-50 font-sans m-0 p-0">
					<Container className="w-full max-w-none mx-auto my-0 p-8 bg-white rounded-lg shadow-sm">
						<Section className="text-center mb-8">
							<Heading className="text-gray-900 text-3xl font-semibold m-0 mb-1 p-0 leading-tight">
								<span className="bg-orange-500 text-white py-1 px-2 rounded mr-2 font-bold">
									HN
								</span>{" "}
								Daily Top 5
							</Heading>
							<Text className="text-gray-500 text-base mt-2 mb-0">{date}</Text>
						</Section>

						<Section className="mb-6">
							<Text className="text-gray-800 text-lg">{`Hello {{name}},`}</Text>
							<Text className="text-gray-700">
								Here are today's top stories from Hacker News:
							</Text>
						</Section>

						{stories.map((story, index) => (
							<Section key={story.id} className="py-4">
								<div className="flex">
									<div className="flex-shrink-0 mr-3">
										<span className="inline-block bg-gray-100 text-gray-600 font-semibold text-sm w-8 h-8 leading-8 text-center rounded-full">
											{index + 1}
										</span>
									</div>
									<div className="flex-grow">
										<Text className="m-0 mb-2 leading-relaxed">
											<Link
												href={
													story.url ||
													`https://news.ycombinator.com/item?id=${story.id}`
												}
												className="text-lg font-medium text-gray-900 no-underline hover:underline">
												{story.title}
											</Link>
										</Text>
										<Text className="text-sm text-gray-500 mt-1">
											<span className="text-green-600 font-medium">
												{story.score} points
											</span>{" "}
											by {story.by} •{" "}
											<Link
												href={`https://news.ycombinator.com/item?id=${story.id}`}
												className="text-gray-500 hover:text-gray-700 no-underline">
												{story.descendants || 0} comments
											</Link>
										</Text>
									</div>
								</div>
								{index < stories.length - 1 && (
									<Hr className="border-t border-gray-200 mt-4 mb-0 p-0" />
								)}
							</Section>
						))}

						<Section className="mt-8 text-center">
							<Hr className="border-t border-gray-200 m-0 mb-5 p-0" />
							<Text className="text-xs text-gray-500">
								You're receiving this email because you subscribed to the Hacker
								News newsletter.
							</Text>
							<Text className="text-xs text-gray-500 mt-2">
								<Link
									href="{{unsubscribe_link}}"
									className="text-gray-500 hover:text-gray-700 underline">
									Unsubscribe
								</Link>{" "}
								from these emails.
							</Text>
						</Section>
					</Container>
				</Body>
			</Html>
		</Tailwind>
	);
};

export default NewsletterEmail;
