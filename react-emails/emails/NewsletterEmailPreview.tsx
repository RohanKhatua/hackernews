import React from "react";
import { NewsletterEmail } from "./NewsletterEmail";

// Sample test data mimicking Hacker News stories
const testStories = [
	{
		id: 1,
		title:
			"Introducing the new React framework for building modern web applications",
		url: "https://example.com/react-framework",
		score: 423,
		by: "techuser",
		descendants: 128,
		excerpt:
			"A faster, simpler way to build modern web applications with a focus on developer experience and performance out of the box.",
	},
	{
		id: 2,
		title: "How we optimized our database to handle 10M requests per second",
		url: "https://example.com/database-optimization",
		score: 387,
		by: "dbexpert",
		descendants: 95,
		excerpt:
			"We walk through the indexing, caching, and query-rewrite strategies that took our Postgres cluster from 200K to 10M requests per second.",
	},
	{
		id: 3,
		title: "The future of AI: What to expect in 2026",
		url: "https://example.com/ai-future",
		score: 362,
		by: "airesearcher",
		descendants: 87,
		excerpt:
			"A survey of the models, tooling, and safety research shaping the next year of artificial intelligence.",
	},
	{
		id: 4,
		title: "Why we migrated from AWS to our own data centers",
		url: "https://example.com/cloud-migration",
		score: 312,
		by: "devopslead",
		descendants: 74,
		excerpt:
			"After a year of tracking costs and latency, here's what convinced us to run our own hardware and what we'd do differently.",
	},
	{
		id: 5,
		title: "Understanding the new TypeScript 6.0 features",
		url: "https://example.com/typescript-6",
		score: 287,
		by: "tsdev",
		descendants: 63,
		excerpt:
			"A deep dive into the type-system improvements, faster compiler, and breaking changes coming in TypeScript 6.0.",
	},
];

// Get current date in a readable format
const currentDate = new Date().toLocaleDateString("en-US", {
	weekday: "long",
	year: "numeric",
	month: "long",
	day: "numeric",
});

// Export the component with test data
export default function NewsletterEmailPreview() {
	return <NewsletterEmail stories={testStories} date={currentDate} />;
}

// Default export for React Email preview
export function PreviewNewsletterEmail() {
	return <NewsletterEmailPreview />;
}
