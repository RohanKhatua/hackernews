"use client"

import { Button } from "./ui/button";
import ArticleComponent from "./article-title-component";
import Loading from "./ui/loading";
import { useArticles } from "@/hooks/article-hook";
import { ArrowLeftIcon, ArrowRightIcon } from "@radix-ui/react-icons";

export default function ArticleList() {

    const { articles, loading, page, setPage } = useArticles();

    return (
        loading ? <Loading /> :
            <div className="flex flex-col items-center">
                <div className="flex flex-col gap-5 py-8">
                    <div className="text-center">
                        Page {page}
                    </div>
                    {articles.map((article) => (
                        <ArticleComponent key={article.id} {...article} />
                    ))}

                    <div className="flex flex-row gap-5 bottom-5 justify-center">
                        {page != 1 ? <Button variant="link" onClick={() => setPage(page - 1)}>
                            <ArrowLeftIcon className="size-8"></ArrowLeftIcon>
                        </Button> : null}
                        <Button variant="link" onClick={() => setPage(page + 1)}><ArrowRightIcon className="size-8"></ArrowRightIcon></Button>
                    </div>
                </div>


            </div >
    );
}

