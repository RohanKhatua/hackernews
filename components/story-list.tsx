"use client";

import { useEffect, useState } from "react";
import { StoryItem } from "@/components/story-item";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useInView } from "react-intersection-observer";

interface StoryListProps {
	type?: "top" | "new" | "best" | "ask" | "show" | "job";
	limit?: number;
}

export function StoryList({ type = "top", limit = 30 }: StoryListProps) {
	const [storyIds, setStoryIds] = useState<number[]>([]);
	const [stories, setStories] = useState<Record<number, any>>({}); // Store stories as a map
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [visiblePages, setVisiblePages] = useState<number[]>([1]);
	const storiesPerPage = limit;

	const { ref: bottomRef, inView: bottomInView } = useInView({
		threshold: 1.0,
	});
	const { ref: topRef, inView: topInView } = useInView({ threshold: 1.0 });

	useEffect(() => {
		const fetchStoryIds = async () => {
			setLoading(true);
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
				const ids = await response.json();
				setStoryIds(ids);
				setVisiblePages([1]);
				setStories({}); // Clear previously fetched stories
			} catch (error) {
				console.error("Error fetching story IDs:", error);
			}
		};

		fetchStoryIds();
	}, [type]);

	useEffect(() => {
		const fetchStories = async (pageToFetch: number) => {
			if (storyIds.length === 0) return;

			setLoading(true);
			const startIndex = (pageToFetch - 1) * storiesPerPage;
			const endIndex = startIndex + storiesPerPage;
			const currentPageIds = storyIds.slice(startIndex, endIndex);

			try {
				const storyPromises = currentPageIds.map((id) =>
					fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(
						(res) => res.json()
					)
				);

				const fetchedStories = await Promise.all(storyPromises);
				setStories((prevStories) => ({
					...prevStories,
					[pageToFetch]: fetchedStories,
				}));
			} catch (error) {
				console.error("Error fetching stories:", error);
			} finally {
				setLoading(false);
			}
		};

		visiblePages.forEach((pageToFetch) => {
			if (!stories[pageToFetch]) {
				fetchStories(pageToFetch);
			}
		});
	}, [storyIds, visiblePages, storiesPerPage]);

	useEffect(() => {
		if (
			bottomInView &&
			!loading &&
			Math.max(...visiblePages) * storiesPerPage < storyIds.length
		) {
			setVisiblePages((prevPages) => {
				const newPages = Array.from(
					new Set([...prevPages, Math.max(...prevPages) + 1])
				);
				return newPages.filter(
					(page) => Math.abs(page - Math.max(...newPages)) <= 2
				); // Keep 3 pages in memory
			});
		}
	}, [bottomInView, loading, visiblePages, storiesPerPage, storyIds.length]);

	useEffect(() => {
		if (topInView && !loading && Math.min(...visiblePages) > 1) {
			setVisiblePages((prevPages) => {
				const newPages = Array.from(
					new Set([Math.min(...prevPages) - 1, ...prevPages])
				);
				return newPages.filter(
					(page) => Math.abs(page - Math.min(...newPages)) <= 2
				); // Keep 3 pages in memory
			});
		}
	}, [topInView, loading, visiblePages]);

	if (loading && Object.keys(stories).length === 0) {
		return (
			<div className="space-y-4">
				{Array.from({ length: 10 }).map((_, i) => (
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

	return (
		<div>
			<div ref={topRef} className="h-10" />

			<div className="space-y-0">
				{visiblePages.flatMap((page) =>
					(stories[page] || []).map((story, index) => (
						<StoryItem
							key={story.id}
							id={story.id}
							title={story.title}
							url={story.url}
							score={story.score}
							by={story.by}
							time={story.time}
							descendants={story.descendants || 0}
							index={(page - 1) * storiesPerPage + index + 1} // Adjust numbering based on page
						/>
					))
				)}
			</div>

			{loading && Object.keys(stories).length > 0 && (
				<div className="flex justify-center items-center py-4">
					<Skeleton className="h-8 w-8 rounded-full animate-spin" />
				</div>
			)}

			<div ref={bottomRef} className="h-10" />
		</div>
	);
}
