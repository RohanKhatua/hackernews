import { getArticleTitles } from "@/api/getArticleTitles";
import { useEffect, useState } from "react";

export const useArticles = () => {
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

        // scroll to top of the page

        const cachedArticles = sessionStorage.getItem(`articles_page_${page}`);
        if (cachedArticles) {
            setArticles(JSON.parse(cachedArticles));
        } else {
            fetchArticles();
        }

        window.scrollTo(0, 0);
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