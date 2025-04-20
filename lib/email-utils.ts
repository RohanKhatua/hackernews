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
export async function sendEmail(
	subject: string,
	htmlContent: string,
	recipient?: string
) {
	try {
		// If specific recipient is provided, send only to them
		if (recipient) {
			const data = await resend.emails.send({
				from: process.env.FROM_EMAIL || "newsletter@yourdomain.com",
				to: recipient,
				subject,
				html: htmlContent,
			});

			console.log("Email sent to:", recipient);
			return { success: true, message: "Email sent successfully", data };
		}

		// Otherwise, send to all active subscribers
		const subscribers = await getAllActiveSubscribers();

		if (subscribers.length === 0) {
			console.log("No subscribers found");
			return { success: false, message: "No subscribers found" };
		}

		// Send to each subscriber with personalized unsubscribe link
		for (const subscriber of subscribers) {
			const unsubscribeUrl = `${
				process.env.NEXT_PUBLIC_APP_URL
			}/api/newsletter/unsubscribe?email=${encodeURIComponent(
				subscriber.email
			)}`;

			const personalizedHtml =
				htmlContent +
				`
        <div style="margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 20px; text-align: center; font-size: 12px; color: #666;">
          <p><a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe</a></p>
        </div>
      `;

			await resend.emails.send({
				from: process.env.FROM_EMAIL || "newsletter@yourdomain.com",
				to: subscriber.email,
				subject,
				html: personalizedHtml,
			});

			console.log("Email sent to:", subscriber.email);
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
