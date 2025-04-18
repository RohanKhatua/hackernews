import * as cron from "node-cron";
import {
	fetchTopStories,
	formatNewsletter,
} from "../lib/server-utils";
import { sendEmail } from "../lib/email-utils";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function sendDailyNewsletter() {
	console.log("Preparing daily newsletter...");

	try {
		// Fetch the top 5 stories
		const stories = await fetchTopStories(5);

		if (stories.length === 0) {
			console.error("No stories fetched. Skipping newsletter.");
			return;
		}

		// Format the stories into an HTML email
		const htmlContent = await formatNewsletter(stories);

		// Send the email to all subscribers
		const date = new Date().toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});

		const result = await sendEmail(`Hacker News Top 5 - ${date}`, htmlContent);

		if (result.success) {
			console.log(result.message);
		} else {
			console.error("No subscribers or error:", result.message);
		}
	} catch (error) {
		console.error("Error sending newsletter:", error);
	}
}

// Function to run the newsletter once
export async function runNewsletter() {
	await sendDailyNewsletter();
}

// Function to schedule the newsletter
export function scheduleNewsletter() {
	// Schedule to run at 7:00 AM every day
	// Cron format: minute hour day-of-month month day-of-week
	cron.schedule("0 7 * * *", async () => {
		console.log("Running scheduled newsletter job...");
		await sendDailyNewsletter();
	});

	console.log("Newsletter scheduled to run at 7:00 AM daily");
}

// If this script is run directly (not imported)
if (require.main === module) {
	// Check for command line arguments
	const args = process.argv.slice(2);

	if (args.includes("--now")) {
		// Run immediately
		runNewsletter().catch(console.error);
	} else if (args.includes("--schedule")) {
		// Schedule daily
		scheduleNewsletter();
	} else {
		console.log("Usage: bun scripts/newsletter.ts [--now|--schedule]");
		console.log("  --now      : Run the newsletter once immediately");
		console.log(
			"  --schedule : Schedule the newsletter to run daily at 7:00 AM"
		);
	}
}
