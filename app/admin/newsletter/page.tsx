"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type Subscriber = {
	id: string;
	email: string;
	name: string | null;
	createdAt: string;
	active: boolean;
};

export default function AdminPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<{
		success?: boolean;
		message?: string;
	} | null>(null);
	const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
	const [subscribersLoading, setSubscribersLoading] = useState(false);
	const [subscribersError, setSubscribersError] = useState<string | null>(null);
	const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

	useEffect(() => {
		fetchSubscribers();
	}, []);

	const fetchSubscribers = async () => {
		try {
			setSubscribersLoading(true);
			setSubscribersError(null);

			const response = await fetch("/api/admin/newsletter/subscribers");

			if (!response.ok) {
				throw new Error(`Failed to fetch subscribers: ${response.statusText}`);
			}

			const data = await response.json();
			setSubscribers(data.subscribers || []);
		} catch (error) {
			console.error("Error fetching subscribers:", error);
			setSubscribersError(
				error instanceof Error ? error.message : "Failed to load subscribers"
			);
		} finally {
			setSubscribersLoading(false);
		}
	};

	const toggleSubscriberStatus = async (id: string, currentStatus: boolean) => {
		try {
			setStatusUpdating(id);
			const response = await fetch("/api/admin/newsletter/toggle-status", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ id, active: !currentStatus }),
			});

			if (!response.ok) {
				throw new Error(`Failed to update status: ${response.statusText}`);
			}

			const data = await response.json();

			if (data.success) {
				// Update the subscribers list with the updated status
				setSubscribers((prev) =>
					prev.map((subscriber) =>
						subscriber.id === id
							? { ...subscriber, active: !currentStatus }
							: subscriber
					)
				);
				toast.success(
					`Subscriber ${currentStatus ? "disabled" : "enabled"} successfully`
				);
			} else {
				throw new Error(data.error || "Failed to update status");
			}
		} catch (error) {
			console.error("Error toggling subscriber status:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to update subscriber status"
			);
		} finally {
			setStatusUpdating(null);
		}
	};

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
			<h1 className="text-2xl text-center font-bold items-center">
				Newsletter Administration
			</h1>

			<div className="p-6 border-b mb-6">
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
						<Button
							onClick={sendNewsletter}
							disabled={isLoading}
							variant={"destructive"}>
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
				</div>
			</div>

			<div className="p-6 border-b mb-6">
				<h2 className="text-xl font-semibold mb-4">Newsletter Schedule</h2>
				<p className="text-gray-600 dark:text-gray-300">
					The newsletter is configured to run automatically at 7:00 AM every
					day.
				</p>
				<p className="mt-2 text-gray-600 dark:text-gray-300">
					To change this schedule, edit the cron expression in{" "}
					<code>.github/workflows/daily-newsletter.yml</code>.
				</p>
			</div>

			<div className="p-6">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold">
						Subscribers{" "}
						{subscribers.length > 0 && (
							<span className="text-sm font-normal">
								({subscribers.length})
							</span>
						)}
					</h2>
					<Button
						variant="outline"
						size="sm"
						onClick={fetchSubscribers}
						disabled={subscribersLoading}>
						{subscribersLoading ? "Refreshing..." : "Refresh"}
					</Button>
				</div>

				{subscribersError && (
					<div className="p-4 mb-4 rounded-md bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
						<p>{subscribersError}</p>
					</div>
				)}

				{subscribersLoading ? (
					<div className="text-center p-8">
						<p className="text-gray-600 dark:text-gray-300">
							Loading subscribers...
						</p>
					</div>
				) : subscribers.length === 0 ? (
					<div className="text-center p-8">
						<p className="text-gray-600 dark:text-gray-300">
							No subscribers found.
						</p>
					</div>
				) : (
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted hover:bg-muted">
									<TableHead>Email</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Subscribed On</TableHead>
									<TableHead className="text-center">Status</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{subscribers.map((subscriber) => (
									<TableRow
										key={subscriber.id}
										className={!subscriber.active ? "opacity-60" : ""}>
										<TableCell>{subscriber.email}</TableCell>
										<TableCell>{subscriber.name || "-"}</TableCell>
										<TableCell>
											{new Date(subscriber.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell className="text-center">
											<span
												className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
													subscriber.active
														? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
														: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
												}`}>
												{subscriber.active ? "Active" : "Inactive"}
											</span>
										</TableCell>
										<TableCell className="text-right w-20">
											<div className="flex items-center justify-end">
												<Switch
													checked={subscriber.active}
													disabled={statusUpdating === subscriber.id}
													onCheckedChange={() =>
														toggleSubscriberStatus(
															subscriber.id,
															subscriber.active
														)
													}
													aria-label={`Toggle ${
														subscriber.active ? "disable" : "enable"
													}`}
												/>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>
		</div>
	);
}
