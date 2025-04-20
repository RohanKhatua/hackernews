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
			<div className="flex">
				{index !== undefined && (
					<div className="mr-2 flex-shrink-0">
						<span className="text-muted-foreground text-base w-5 sm:w-6 text-right inline-block">
							{index}.
						</span>
					</div>
				)}
				<div className="flex-1 min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<Link
							href={url || `/item/${id}`}
							className="text-foreground font-medium text-base sm:text-lg break-words hover:text-primary"
							target={url ? "_blank" : undefined}
							rel={url ? "noopener noreferrer" : undefined}>
							{title}
						</Link>
						{url && (
							<Link
								href={url}
								className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary"
								target="_blank"
								rel="noopener noreferrer">
								<ExternalLink className="h-3 w-3 flex-shrink-0" />
								<span className="truncate max-w-[120px] sm:max-w-none">
									{domain}
								</span>
							</Link>
						)}
					</div>
					<div className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center">
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
