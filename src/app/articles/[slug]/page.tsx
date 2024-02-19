"use client"

import convertTagstoTextExceptLinks from "@/lib/convert-tags";
import { getArticleData } from "@/api/getArticleData";
import Comment from "@/components/comment";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Article({ params }: { params: { slug: string } }) {

    const [article, setArticle] = useState<Item>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchArticle() {
            setLoading(true);
            try {
                const articleData = await getArticleData(Number(params.slug));
                setArticle(articleData);
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        }

        fetchArticle();
    }, [params.slug]);

    // Early return for loading state
    if (loading) {
        return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
    }

    // Handle the error state or when article is null or undefined
    if (!article) {
        return (
            <div>
                <div>Error fetching article</div>;
                <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
            </div>
        );
    }

    // Render article content when article is available
    return (
        <>
            <div className="px-24 pt-24 flex flex-col gap-5 justify-center text-center">
                <div className="text-3xl font-medium">{article.title}</div>
                <div className="text-sm font-bold">by {article.by}</div>
                {article.time && <div className="text-sm font-light">Published on {new Date(article.time * 1000).toLocaleString()}</div>}
                {article.text && <div className="text-sm font-light">{convertTagstoTextExceptLinks(article.text)}</div>}
                {article.url && <Button className="text-lg" variant="link" onClick={() => window.open(article.url, '_blank')}>Read Article →</Button>}
                {article.score && <div className="text-sm font-light">{article.score} points</div>}
                <div>
                    <Button className="w-fit" variant="outline">
                        <Link href="/">Go Back</Link>
                    </Button>
                </div>
            </div>

            {/* Comments div */}

            {article.kids && article.kids?.length > 0 && <div>

                <div className="px-10 md:px-40">
                    <div className="py-10 text-2xl font-semibold">
                        Comments
                    </div>

                    <div className="flex flex-col ">
                        {
                            article.kids?.map((kid: number) => {
                                return (
                                    <Comment key={kid} commentId={kid} depth={0}></Comment>
                                );
                            })
                        }
                    </div>
                </div>

            </div>}

        </>
    );

}