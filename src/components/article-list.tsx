"use client"

import { useState, useEffect } from "react";
import { getArticleTitles } from "@/api/getArticleTitles";
import { Button } from "./ui/button";
import ArticleComponent from "./article-title-component";
import Loading from "./ui/loading";


const useArticles = () => {
    const [articles, setArticles] = useState<ItemTitle[]>([]);
    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(() => {
        if (typeof window !== 'undefined' && window.sessionStorage) {
            return parseInt(window.sessionStorage.getItem('lastVisitedPage') || '1', 10);
        }
        return 1;
    });

    useEffect(() => {
        async function fetchArticles() {
            setLoading(true);

            try {
                const articlesData = await getArticleTitles(page);
                sessionStorage.setItem(`articles_page_${page}`, JSON.stringify(articlesData));
                setArticles(articlesData);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }

        const cachedArticles = sessionStorage.getItem(`articles_page_${page}`);
        if (cachedArticles) {
            setArticles(JSON.parse(cachedArticles));
        } else {
            fetchArticles();
        }

        return () => {
            sessionStorage.setItem('lastVisitedPage', page.toString());
        }
    }, [page]);

    useEffect(() => {
        const clearCache = () => {
            sessionStorage.clear();
        };

        window.onbeforeunload = clearCache;

        return () => {
            window.onbeforeunload = null;
        };
    }, []);

    return { articles, loading, page, setPage };
}

export default function ArticleList() {

    const { articles, loading, page, setPage } = useArticles();

    return (
        loading ? <Loading /> :
            <div>
                <div className="flex flex-col gap-5 py-8">
                    <div className="text-center">
                        Page {page}
                    </div>
                    {articles.map((article) => (
                        <ArticleComponent key={article.id} {...article} />
                    ))}
                    <div className="flex flex-row gap-5 items-center justify-center">
                        {page != 1 ? <Button onClick={() => setPage(page - 1)}>Previous Page</Button> : null}
                        <Button onClick={() => setPage(page + 1)}>Next Page</Button>
                    </div>
                </div>
            </div>
    );
}

