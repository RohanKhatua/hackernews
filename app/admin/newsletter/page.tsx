"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function AdminPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<{
		success?: boolean;
		message?: string;
	} | null>(null);

	const sendNewsletter = async () => {
		try {
			setIsLoading(true);
			setResult(null);

			const response = await fetch("/api/send-newsletter");
			const data = await response.json();

			setResult(data);
		} catch (error) {
			setResult({ success: false, message: String(error) });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-6">
			<h1 className="text-2xl font-bold mb-6">Newsletter Admin</h1>

			<div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
				<h2 className="text-xl font-semibold mb-4">
					Manual Newsletter Controls
				</h2>

				<div className="flex flex-col gap-4">
					<p className="text-gray-600 dark:text-gray-300">
						Click the button below to manually send the newsletter for testing
						purposes. This will send an email with the top 5 Hacker News stories
						to the configured recipient.
					</p>

					<div>
						<Button onClick={sendNewsletter} disabled={isLoading}>
							{isLoading ? "Sending..." : "Send Newsletter Now"}
						</Button>
					</div>

					{result && (
						<div
							className={`p-4 mt-4 rounded-md ${
								result.success
									? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
									: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
							}`}>
							<p>{result.message}</p>
						</div>
					)}

					<div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
						<h3 className="text-md font-semibold mb-2">
							Alternatively, use the command line:
						</h3>
						<pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
							<code>bun scripts/newsletter.ts --now</code>
						</pre>
					</div>
				</div>
			</div>

			<div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
				<h2 className="text-xl font-semibold mb-4">Newsletter Schedule</h2>
				<p className="text-gray-600 dark:text-gray-300">
					The newsletter is configured to run automatically at 7:00 AM every
					day.
				</p>
				<p className="mt-2 text-gray-600 dark:text-gray-300">
					To change this schedule, edit the cron expression in{" "}
					<code>scripts/newsletter.ts</code>.
				</p>

				<div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900">
					<h3 className="text-md font-semibold mb-2">
						To start the scheduler:
					</h3>
					<pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
						<code>bun scripts/newsletter.ts --schedule</code>
					</pre>
				</div>
			</div>
		</div>
	);
}
