import { NextResponse } from "next/server";
import { fetchTopStories, formatNewsletter } from "../../../lib/server-utils";
import { sendEmail } from "../../../lib/email-utils";

export async function GET() {
	try {
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
