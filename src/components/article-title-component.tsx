import { ArrowTopRightIcon, HeartIcon } from "@radix-ui/react-icons";
import Link from "next/link"
import { Button } from "./ui/button";

export default function ArticleTitleComponent(article: ItemTitle) {


    return (
        <div className="flex flex-col">
            <div className="flex flex-row gap-3">
                
                <Link href={`/articles/${article.id}`}>
                    <div className="text-2xl">
                        {article.title}
                    </div>
                </Link>

                <div>
                    {article.url && <Button variant="link" onClick={() => window.open(article.url, "blank")}><ArrowTopRightIcon className="scale-125"></ArrowTopRightIcon></Button>}
                </div>
            </div>
        </div>
    );
}