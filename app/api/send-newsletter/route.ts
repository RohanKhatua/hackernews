import { NextResponse } from "next/server";
import { fetchTopStories } from "@/lib/server-utils";
import { sendEmail, formatNewsletter } from "@/lib/email-utils";
import { requireAdmin } from "@/lib/auth-utils";
import { headers } from "next/headers";

// API key authentication function
async function validateApiKey(headersList: Headers): Promise<boolean> {
	const apiKey = headersList.get("x-api-key");
	const validApiKey = process.env.NEWSLETTER_API_KEY;

	// If no API key is configured in environment, this authentication method is disabled
	if (!validApiKey) {
		return false;
	}

	return apiKey === validApiKey;
}

export async function GET() {
	try {
		// First try admin authentication
		try {
			// This will throw an error if not authenticated as admin
			await requireAdmin();
		} catch (authError) {
			// Admin auth failed, try API key authentication
			const headersList = headers();
			const isValidApiKey = await validateApiKey(await headersList);

			if (!isValidApiKey) {
				// Both authentication methods failed
				return NextResponse.json(
					{ success: false, message: "Unauthorized" },
					{ status: 401 }
				);
			}
		}

		// Authentication successful (either admin or API key), proceed with newsletter sending
		// Fetch the top 5 stories
		const stories = await fetchTopStories(5);

		if (stories.length === 0) {
			return NextResponse.json(
				{ success: false, message: "Failed to fetch stories" },
				{ status: 500 }
			);
		}

		// Format the stories into an HTML email
		const htmlContent = await formatNewsletter(stories);

		// Send the email to all subscribers
		const date = new Date().toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});

		const result = await sendEmail(`Hacker News Top 5 - ${date}`, htmlContent);

		if (!result.success) {
			return NextResponse.json(
				{ success: false, message: result.message },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: result.message,
		});
	} catch (error) {
		console.error("Error sending newsletter:", error);
		return NextResponse.json(
			{
				success: false,
				message: "Failed to send newsletter",
				error: String(error),
			},
			{ status: 500 }
		);
	}
}
