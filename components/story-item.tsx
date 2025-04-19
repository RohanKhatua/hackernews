import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StoryItemProps {
	id: number;
	title: string;
	url?: string;
	score: number;
	by: string;
	time: number;
	descendants: number;
	index?: number;
}

export function StoryItem({
	id,
	title,
	url,
	score,
	by,
	time,
	descendants,
	index,
}: StoryItemProps) {
	const domain = url ? new URL(url).hostname.replace(/^www\./, "") : null;
	const formattedTime = formatDistanceToNow(new Date(time * 1000), {
		addSuffix: true,
	});

	return (
		<div className="py-3 border-b border-border/40 last:border-0">
			<div className="flex items-start">
				{index !== undefined && (
					<span className="text-muted-foreground mr-2 mt-0.5 text-sm w-5 sm:w-6 text-right flex-shrink-0">
						{index}.
					</span>
				)}
				<div className="flex-1 min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<Link
							href={url || `/item/${id}`}
							className="text-foreground font-medium text-sm sm:text-base break-words hover:text-primary"
							target={url ? "_blank" : undefined}
							rel={url ? "noopener noreferrer" : undefined}>
							{title}
						</Link>
						{url && (
							<Link
								href={url}
								className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary"
								target="_blank"
								rel="noopener noreferrer">
								<ExternalLink className="h-3 w-3 flex-shrink-0" />
								<span className="truncate max-w-[120px] sm:max-w-none">
									{domain}
								</span>
							</Link>
						)}
					</div>
					<div className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center">
						<span>{score} points</span>
						<span className="mx-1">•</span>
						<Link href={`/user/${by}`} className="hover:text-primary">
							{by}
						</Link>
						<span className="mx-1">•</span>
						<span>{formattedTime}</span>
						<span className="mx-1">•</span>
						<Link href={`/item/${id}`} className="hover:text-primary">
							{descendants} {descendants === 1 ? "comment" : "comments"}
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
