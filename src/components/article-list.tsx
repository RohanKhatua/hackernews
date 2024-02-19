"use client"

import { Button } from "./ui/button";
import ArticleComponent from "./article-title-component";
import Loading from "./ui/loading";
import { useArticles } from "@/hooks/article-hook";

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

