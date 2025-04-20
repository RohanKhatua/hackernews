"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function AdminSetupPage() {
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setResult(null);

		try {
			const res = await fetch("/api/admin/setup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					password,
					name,
				}),
			});

			const data = await res.json();

			setResult({
				success: data.success,
				message:
					data.message ||
					(data.success
						? "Admin user created successfully!"
						: "Failed to create admin user."),
			});
		} catch (error) {
			setResult({
				success: false,
				message: "An error occurred while setting up the admin user.",
			});
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<main className="flex-1 flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="text-2xl font-bold">Admin Setup</CardTitle>
						<CardDescription>
							Create the first admin user for your application
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							{result && (
								<div
									className={`p-3 ${
										result.success
											? "bg-green-100 text-green-800 border border-green-200"
											: "bg-red-100 text-red-800 border border-red-200"
									} rounded-md mb-4`}>
									{result.message}
									{result.success && (
										<p className="mt-2">
											<Link
												href="/auth/login"
												className="text-blue-600 hover:underline">
												Go to login page →
											</Link>
										</p>
									)}
								</div>
							)}

							<div className="space-y-2">
								<label htmlFor="email" className="block text-sm font-medium">
									Email
								</label>
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="w-full"
								/>
							</div>

							<div className="space-y-2">
								<label htmlFor="name" className="block text-sm font-medium">
									Name (Optional)
								</label>
								<Input
									id="name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full"
								/>
							</div>

							<div className="space-y-2">
								<label htmlFor="password" className="block text-sm font-medium">
									Password
								</label>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									className="w-full"
								/>
							</div>

							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? "Creating..." : "Create Admin User"}
							</Button>
						</form>
					</CardContent>
					<CardFooter className="flex justify-center">
						<p className="text-sm text-gray-500">
							Note: This setup can only be done once when no users exist in the
							system.
						</p>
					</CardFooter>
				</Card>
			</main>
		</div>
	);
}
