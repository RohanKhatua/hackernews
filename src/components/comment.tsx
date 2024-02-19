"use client";

import { getCommentData } from "@/api/getCommentData";
import { useEffect, useState } from "react";
import Loading from "./ui/loading";
import { Button } from "./ui/button";

interface CommentProps {
    commentId: number;
    depth: number;
}

export default function Comment({ commentId, depth }: CommentProps) {
    const [comment, setComment] = useState<CommentItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [showMore, setShowMore] = useState(false);

    const fetchComment = async () => {
        setLoading(true);
        try {
            const commentData = await getCommentData(commentId);
            setComment(commentData);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchComment();
    }, [commentId]);

    if (loading) {
        return <Loading />;
    }

    return (
        <div>
            {comment && (
                <div>
                    <div className="text-base font-semibold text-primary">{comment.by}</div>
                    <div className="text-lg font-light py-3" dangerouslySetInnerHTML={{ __html: comment.text }} />
                    {comment.kids && comment.kids.length > 0 && (
                        <div className="ml-5">
                            <Button variant="ghost" className="pb-2 pt-1" onClick={() => setShowMore(!showMore)}>
                                <div className="underline">
                                    {showMore ? 'Hide' : 'Show'} {comment.kids.length} comment(s)
                                </div>
                            </Button>
                            {showMore && comment.kids.map((kid, index) => (
                                <Comment key={index} commentId={kid} depth={depth + 1} />
                            ))}
                        </div>
                    )}
                </div>)
            }
        </div>
    );


}