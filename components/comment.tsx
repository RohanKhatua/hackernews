"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CommentProps {
	id: number;
	level?: number;
}

export function Comment({ id, level = 0 }: CommentProps) {
	const [comment, setComment] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [expanded, setExpanded] = useState(true);

	useEffect(() => {
		const fetchComment = async () => {
			try {
				const response = await fetch(
					`https://hacker-news.firebaseio.com/v0/item/${id}.json`
				);
				const data = await response.json();
				setComment(data);
			} catch (error) {
				console.error("Error fetching comment:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchComment();
	}, [id]);

	if (loading) {
		return (
			<div
				className={`pl-2 sm:pl-4 border-l border-border/40 ${
					level > 0 ? "ml-2 sm:ml-4 mt-4" : "mt-6"
				}`}>
				<Skeleton className="h-4 w-3/4 mb-2" />
				<Skeleton className="h-3 w-1/2 mb-1" />
				<Skeleton className="h-3 w-full mb-1" />
				<Skeleton className="h-3 w-5/6" />
			</div>
		);
	}

	if (!comment || comment.deleted || comment.dead) {
		return null;
	}

	const formattedTime = formatDistanceToNow(new Date(comment.time * 1000), {
		addSuffix: true,
	});

	// Limit nesting on mobile to prevent horizontal overflow
	const shouldNest = level < 6 || window.innerWidth >= 640;
	const nestingClass = shouldNest
		? `pl-2 sm:pl-4 border-l border-border/40 ${
				level > 0 ? "ml-2 sm:ml-4 mt-4" : "mt-6"
			}`
		: "mt-4 pt-2 border-t border-border/40";

	return (
		<div className={nestingClass}>
			<div className="flex items-center gap-2 text-sm text-foreground mb-1">
				<Button
					variant="ghost"
					size="icon"
					className="h-5 w-5 p-0"
					onClick={() => setExpanded(!expanded)}>
					{expanded ? (
						<ChevronDown className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
				</Button>
				<Link
					href={`/user/${comment.by}`}
					className="font-medium hover:text-primary">
					{comment.by}
				</Link>
				<span>{formattedTime}</span>
			</div>

			{expanded && (
				<>
					<div
						className="text-base mt-1 pl-5 max-w-none prose-p:my-1 prose-a:text-primary break-words overflow-x-auto"
						dangerouslySetInnerHTML={{ __html: comment.text || "" }}
					/>

					{comment.kids && comment.kids.length > 0 && (
						<div>
							{comment.kids.map((kidId: number) => (
								<Comment key={kidId} id={kidId} level={level + 1} />
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
}
