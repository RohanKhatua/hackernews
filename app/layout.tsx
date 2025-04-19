import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Hacker News - But Better",
	description: "A modern Hacker News built with Next.js and shadcn/ui",
	generator: "Next.js",
	applicationName: "Hacker News - But Better",
	referrer: "origin-when-cross-origin",
	keywords: [
		"Hacker News",
		"HN",
		"news",
		"technology",
		"programming",
		"software",
		"development",
		"web",
		"web development",
		"shadcn",
		"ui",
		"OpenAI",
	],
	authors: [
		{
			name: "Rohan Khatua",
			url: "https://rohankhatua.dev",
		},
	],
	creator: "Rohan Khatua",
	publisher: "Rohan Khatua",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={inter.className}>
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					forcedTheme="dark"
					enableSystem={false}
					disableTransitionOnChange>
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
