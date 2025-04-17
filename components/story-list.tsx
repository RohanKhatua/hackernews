"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { StoryItem } from "@/components/story-item";
import { Skeleton } from "@/components/ui/skeleton";

interface StoryListProps {
	type?: "top" | "new" | "best" | "ask" | "show" | "job";
	limit?: number;
}

export function StoryList({ type = "top", limit = 30 }: StoryListProps) {
	const [storyIds, setStoryIds] = useState<number[]>([]);
	const [storyCache, setStoryCache] = useState<Map<number, any>>(new Map());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Removed virtualizer usage and implemented a simple paginated list
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 30;

	// Calculate paginated story IDs
	const paginatedStoryIds = storyIds.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	// Handle page change
	const handleNextPage = () => {
		if (currentPage * itemsPerPage < storyIds.length) {
			setCurrentPage((prev) => prev + 1);
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	const handlePreviousPage = () => {
		if (currentPage > 1) {
			setCurrentPage((prev) => prev - 1);
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	// Keep track of fetch attempts to avoid excessive retries
	const fetchAttemptsRef = useRef<Map<number, number>>(new Map());
	// Track active fetches
	const activeRequestsRef = useRef<Set<number>>(new Set());
	// Track last time we scrolled
	const lastScrollTimeRef = useRef<number>(Date.now());

	// Reference to the scroll container
	const parentRef = useRef<HTMLDivElement>(null);

	// Logging for debugging
	const [stats, setStats] = useState({
		fetchedCount: 0,
		cacheSize: 0,
		lastFetch: Date.now(),
		activeRequests: 0,
	});

	// Fetch story IDs when type changes
	useEffect(() => {
		const fetchStoryIds = async () => {
			setLoading(true);
			setError(null);
			try {
				const endpoint =
					type === "new"
						? "newstories"
						: type === "best"
						? "beststories"
						: type === "ask"
						? "askstories"
						: type === "show"
						? "showstories"
						: type === "job"
						? "jobstories"
						: "topstories";

				const response = await fetch(
					`https://hacker-news.firebaseio.com/v0/${endpoint}.json`
				);
				if (!response.ok)
					throw new Error(`Failed to fetch stories: ${response.statusText}`);

				const ids = await response.json();
				setStoryIds(ids?.slice(0, 500) || []); // Limit to 500 stories max

				// Clear the cache and tracking state when story type changes
				setStoryCache(new Map());
				fetchAttemptsRef.current.clear();
				activeRequestsRef.current.clear();

				setStats({
					fetchedCount: 0,
					cacheSize: 0,
					lastFetch: Date.now(),
					activeRequests: 0,
				});
			} catch (err) {
				console.error("Error fetching story IDs:", err);
				setError(
					err instanceof Error ? err.message : "Failed to fetch stories"
				);
			} finally {
				setLoading(false);
			}
		};

		fetchStoryIds();
		return () => {
			// Clean up when component unmounts or type changes
			fetchAttemptsRef.current.clear();
			activeRequestsRef.current.clear();
		};
	}, [type]);

	// Handle scroll events to track scrolling activity
	useEffect(() => {
		const scrollElement = parentRef.current;
		if (!scrollElement) return;

		const handleScroll = () => {
			lastScrollTimeRef.current = Date.now();
		};

		scrollElement.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			scrollElement.removeEventListener("scroll", handleScroll);
		};
	}, []);

	// Fetch a single story
	const fetchStory = useCallback(
		async (id: number) => {
			if (!id || storyCache.has(id) || activeRequestsRef.current.has(id)) {
				return null;
			}

			// Track number of fetch attempts
			const attempts = fetchAttemptsRef.current.get(id) || 0;
			if (attempts >= 3) {
				// Give up after 3 attempts
				return null;
			}

			fetchAttemptsRef.current.set(id, attempts + 1);
			activeRequestsRef.current.add(id);

			// Update active requests count
			setStats((prev) => ({
				...prev,
				activeRequests: activeRequestsRef.current.size,
			}));

			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

				const response = await fetch(
					`https://hacker-news.firebaseio.com/v0/item/${id}.json`,
					{ signal: controller.signal }
				);

				clearTimeout(timeoutId);

				if (!response.ok) {
					throw new Error(`Failed to fetch story ${id}: ${response.status}`);
				}

				const story = await response.json();

				if (story) {
					setStoryCache((prev) => {
						const newCache = new Map(prev);
						newCache.set(id, story);
						return newCache;
					});

					setStats((prev) => ({
						fetchedCount: prev.fetchedCount + 1,
						cacheSize: prev.cacheSize + 1,
						lastFetch: Date.now(),
						activeRequests: activeRequestsRef.current.size - 1,
					}));

					return story;
				}
			} catch (err) {
				if (err.name !== "AbortError") {
					console.error(`Error fetching story ${id}:`, err);
				}
				return null;
			} finally {
				activeRequestsRef.current.delete(id);

				// Update active requests count
				setStats((prev) => ({
					...prev,
					activeRequests: activeRequestsRef.current.size,
				}));
			}
		},
		[storyCache]
	);

	// Main fetch effect that triggers when visible items change
	useEffect(() => {
		if (storyIds.length === 0 || loading) return;

		let isMounted = true;
		const controller = new AbortController();

		const fetchVisibleStories = async () => {
			// Get visible story IDs that need fetching
			const visibleIds = new Set<number>();

			for (const storyId of paginatedStoryIds) {
				if (
					storyId &&
					!storyCache.has(storyId) &&
					!activeRequestsRef.current.has(storyId)
				) {
					visibleIds.add(storyId);
				}
			}

			// Convert to array and prioritize
			const idsToFetch = Array.from(visibleIds);
			if (idsToFetch.length === 0) return;

			// Process in small batches to avoid overwhelming the browser
			const MAX_CONCURRENT = 3;
			const processBatch = async (startIdx: number) => {
				if (!isMounted || controller.signal.aborted) return;

				const endIdx = Math.min(startIdx + MAX_CONCURRENT, idsToFetch.length);
				const batch = idsToFetch.slice(startIdx, endIdx);

				// Process each item in the batch sequentially
				for (const id of batch) {
					if (!isMounted || controller.signal.aborted) return;
					await fetchStory(id);
					// Small delay between fetches
					await new Promise((resolve) => setTimeout(resolve, 100));
				}

				// Process next batch if there are more items
				if (
					endIdx < idsToFetch.length &&
					isMounted &&
					!controller.signal.aborted
				) {
					// Longer delay between batches
					await new Promise((resolve) => setTimeout(resolve, 300));
					await processBatch(endIdx);
				}
			};

			// Start processing first batch
			await processBatch(0);
		};

		fetchVisibleStories();

		return () => {
			isMounted = false;
			controller.abort();
		};
	}, [storyIds, loading, storyCache, paginatedStoryIds, fetchStory]);

	// Check for stalled fetches and trigger re-fetch
	useEffect(() => {
		const checkInterval = setInterval(() => {
			// Return early if we're already maxed out on active requests
			if (activeRequestsRef.current.size >= 3) return;

			// Check if we need to fetch more based on visible items
			let needsFetch = false;
			for (const storyId of paginatedStoryIds) {
				if (
					storyId &&
					!storyCache.has(storyId) &&
					!activeRequestsRef.current.has(storyId)
				) {
					needsFetch = true;
					break;
				}
			}

			// If we have any unfetched items, trigger a render to make the fetch effect run
			if (needsFetch) {
				setStats((prev) => ({ ...prev, lastFetch: Date.now() }));
			}
		}, 2000); // Check every 2 seconds

		return () => clearInterval(checkInterval);
	}, [storyIds, storyCache, paginatedStoryIds]);

	// Regular stats update to keep the UI fresh
	useEffect(() => {
		const updateInterval = setInterval(() => {
			setStats((prev) => ({
				...prev,
				cacheSize: storyCache.size,
				activeRequests: activeRequestsRef.current.size,
			}));
		}, 1000);

		return () => clearInterval(updateInterval);
	}, [storyCache]);

	// Handle initial loading
	if (loading && storyIds.length === 0) {
		return (
			<div className="space-y-4">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="py-3 border-b border-border/40 last:border-0">
						<div className="flex items-start">
							<Skeleton className="h-4 w-6 mr-2" />
							<div className="flex-1">
								<Skeleton className="h-5 w-full mb-2" />
								<Skeleton className="h-3 w-3/4" />
							</div>
						</div>
					</div>
				))}
			</div>
		);
	}

	// Handle error state
	if (error) {
		return (
			<div className="flex flex-col items-center justify-center p-8 text-center">
				<p className="text-red-500 mb-4">Failed to load stories: {error}</p>
				<button
					className="px-4 py-2 bg-primary text-primary-foreground rounded"
					onClick={() => window.location.reload()}>
					Retry
				</button>
			</div>
		);
	}

	// Handle empty state
	if (storyIds.length === 0 && !loading) {
		return (
			<div className="flex justify-center items-center p-8">
				<p className="text-gray-500">No stories found.</p>
			</div>
		);
	}

	return (
		<div className="overflow-auto h-screen">
			{/* Stats display */}
			<div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white p-2 rounded-md text-xs z-50">
				Fetched: {stats.fetchedCount} | Cache: {stats.cacheSize} | Active:{" "}
				{stats.activeRequests}
			</div>

			{/* Simple paginated list */}
			<div>
				{paginatedStoryIds.map((storyId, index) => {
					const story = storyCache.get(storyId);

					return (
						<div key={storyId} className="py-3 border-b border-border/40">
							{story ? (
								<StoryItem
									id={story.id}
									title={story.title || "Untitled Story"}
									url={story.url}
									score={story.score}
									by={story.by}
									time={story.time}
									descendants={story.descendants || 0}
									index={(currentPage - 1) * itemsPerPage + index + 1}
								/>
							) : (
								<div className="flex items-start">
									<Skeleton className="h-4 w-6 mr-2" />
									<div className="flex-1">
										<Skeleton className="h-5 w-full mb-2" />
										<Skeleton className="h-3 w-3/4" />
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Pagination controls */}
			<div className="flex justify-center items-center py-4 space-x-4">
				<button
					className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
					onClick={handlePreviousPage}
					disabled={currentPage === 1}>
					Previous
				</button>
				<span>Page {currentPage}</span>
				<button
					className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
					onClick={handleNextPage}
					disabled={currentPage * itemsPerPage >= storyIds.length}>
					Next
				</button>
			</div>

			{/* Loading indicator */}
			{loading && storyIds.length > 0 && (
				<div className="flex justify-center items-center py-4">
					<div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent" />
				</div>
			)}
		</div>
	);
}
