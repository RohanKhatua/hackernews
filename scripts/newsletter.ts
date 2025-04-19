import { fetchTopStories, formatNewsletter } from "../lib/server-utils";
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

// Export the send function for use in API routes
export async function runNewsletter() {
	await sendDailyNewsletter();
}

// If this script is run directly (not imported)
if (require.main === module) {
	// Run the newsletter once
	runNewsletter().catch(console.error);
	console.log(
		"For automated daily sending, use the GitHub Actions workflow configured at 7:00 AM IST"
	);
}
