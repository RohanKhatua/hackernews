"use server";

import { Resend } from "resend";
import { getAllActiveSubscribers } from "./db";
import { render } from "@react-email/components";
import NewsletterEmail from "@/react-emails/emails/NewsletterEmail";

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export async function formatNewsletter(stories: any[]) {
	const date = new Date().toLocaleDateString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	// Use react-email to render the email template
	const html = await render(NewsletterEmail({ stories, date }));
	return html;
}

/**
 * Send an email using Resend
 * @param subject Email subject
 * @param htmlContent Email HTML content
 * @param recipient Optional specific recipient (if not provided, sends to all subscribers)
 */
export async function sendEmail(subject: string, htmlContent: string) {
	try {
		// Otherwise, send to all active subscribers
		const subscribers = await getAllActiveSubscribers();

		if (subscribers.length === 0) {
			console.log("No subscribers found");
			return { success: false, message: "No subscribers found" };
		}

		const batchSize = 100; // Adjust batch size as needed
		const numBatches = Math.ceil(subscribers.length / batchSize);

		for (let i = 0; i < numBatches; i++) {
			const start = i * batchSize;
			const end = start + batchSize;

			let emailObjectBatch = [];

			for (let j = start; j < end && j < subscribers.length; j++) {
				const subscriber = subscribers[j];
				const unsubscribeUrl = `${
					process.env.NEXT_PUBLIC_APP_URL
				}/api/newsletter/unsubscribe?id=${encodeURIComponent(subscriber.id)}`;

				const personalizedEmail = htmlContent
					.replace("{{unsubscribe_link}}", unsubscribeUrl)
					.replace("{{name}}", subscriber.name || "there");

				emailObjectBatch.push({
					from: process.env.FROM_EMAIL || "newsletter@yourdomain.com",
					to: subscriber.email,
					subject: subject,
					html: personalizedEmail,
				});
			}

			// Send batch of emails
			await resend.batch.send(emailObjectBatch);
			console.log(`Batch ${i + 1} of ${numBatches} sent`);
		}

		return {
			success: true,
			message: `Email sent to ${subscribers.length} subscribers`,
		};
	} catch (error) {
		console.error("Error sending email: ", error);
		throw error;
	}
}
