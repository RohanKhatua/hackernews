"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

export function NewsletterForm() {
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email) {
			toast("Please enter a valid email address.");
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch("/api/newsletter/subscribe", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, name }),
			});

			const data = await response.json();

			if (data.success) {
				toast.success("Successfully subscribed to the newsletter!");
				setEmail("");
				setName("");
			} else {
				toast.error(data.error || "Failed to subscribe. Please try again.");
			}
		} catch (error) {
			toast.error("Something went wrong. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="rounded-lg p-6 my-6">
			<h2 className="text-xl font-bold mb-2">
				Subscribe to Daily HN Newsletter
			</h2>
			<p className="text-slate-600 dark:text-slate-400 mb-4">
				Get the top 5 Hacker News stories in your inbox every morning.
			</p>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<Input
						type="email"
						placeholder="your@email.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						className="w-full"
					/>
				</div>
				<div>
					<Input
						type="text"
						placeholder="Your name (optional)"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-full"
					/>
				</div>
				<Button type="submit" disabled={isLoading} className="w-full">
					{isLoading ? "Subscribing..." : "Subscribe"}
				</Button>
			</form>
		</div>
	);
}
