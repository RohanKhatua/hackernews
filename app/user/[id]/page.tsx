"use client";

import { useState, useEffect, use } from "react";
import { Header } from "@/components/header";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserData = {
	id: string;
	created: number;
	karma: number;
	about?: string;
	submitted?: number[];
};

export default function UserPage({
	params,
}: {
	params: { id: string } | Promise<{ id: string }>;
}) {
	const resolvedParams = use(params);
	const { id } = resolvedParams;
	const [user, setUser] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const response = await fetch(
					`https://hacker-news.firebaseio.com/v0/user/${id}.json`
				);
				const data = await response.json();
				setUser(data);
			} catch (error) {
				console.error("Error fetching user:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchUser();
	}, [id]);

	return (
		<div className="min-h-screen flex flex-col bg-background">
			<Header />
			<main className="flex-1 container max-w-4xl py-4 sm:py-6 px-4 sm:px-6">
				{loading ? (
					<div className="space-y-4">
						<Skeleton className="h-12 w-1/3 mb-6" />
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<Skeleton className="h-40 w-full" />
							<Skeleton className="h-40 w-full" />
						</div>
					</div>
				) : user ? (
					<div className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between">
							<h1 className="text-2xl sm:text-3xl font-bold">{user.id}</h1>
							<div className="mt-2 sm:mt-0 px-4 py-1 bg-primary/10 rounded-full text-primary text-sm font-medium">
								{user.karma} karma
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<Card className="p-4 sm:p-6">
								<h2 className="text-xl font-semibold mb-4">Profile Info</h2>
								<div className="space-y-3">
									<div className="flex justify-between border-b border-border pb-2">
										<span className="text-muted-foreground">Username</span>
										<span className="font-medium">{user.id}</span>
									</div>
									<div className="flex justify-between border-b border-border pb-2">
										<span className="text-muted-foreground">Created</span>
										<span className="font-medium">
											{formatDistanceToNow(new Date(user.created * 1000), {
												addSuffix: true,
											})}
										</span>
									</div>
									<div className="flex justify-between pb-2">
										<span className="text-muted-foreground">Submissions</span>
										<span className="font-medium">
											{user.submitted?.length || 0}
										</span>
									</div>
								</div>
							</Card>

							{user.about ? (
								<Card className="p-4 sm:p-6">
									<h2 className="text-xl font-semibold mb-4">About</h2>
									<div
										className="prose prose-sm max-w-none break-words text-foreground"
										dangerouslySetInnerHTML={{ __html: user.about }}
									/>
								</Card>
							) : (
								<Card className="p-4 sm:p-6 flex items-center justify-center text-muted-foreground">
									No about information provided
								</Card>
							)}
						</div>
					</div>
				) : (
					<Card className="p-6 text-center">
						<p className="text-muted-foreground">User not found.</p>
					</Card>
				)}
			</main>
		</div>
	);
}
