"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/lib/auth-client";
import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/header";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from "@/components/ui/card";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const { login, isLoading, error } = useLogin();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await login(email, password);
	};

	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<main className="flex-1 flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							{error && (
								<div className="p-3 bg-red-100 text-red-800 border border-red-200 rounded-md">
									{error}
								</div>
							)}
							<div className="space-y-2">
								<label htmlFor="email" className="block text-sm font-medium">
									Email
								</label>
								<Input
									id="email"
									type="email"
									placeholder="your@email.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
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
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									className="w-full"
								/>
							</div>
							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading ? "Logging in..." : "Login"}
							</Button>
						</form>
					</CardContent>
					<CardFooter className="flex justify-center">
						<div className="text-sm text-gray-500">
							<Link href="/" className="hover:text-primary">
								Return to Home
							</Link>
						</div>
					</CardFooter>
				</Card>
			</main>
		</div>
	);
}
