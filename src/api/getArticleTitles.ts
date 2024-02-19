import axios from 'axios';

export async function getArticleTitles(page: number = 1, pageSize: number = 10): Promise<ItemTitle[]> {
    const response = await axios.get("https://hacker-news.firebaseio.com/v0/topstories.json");
    const data: number[] = response.data;

    // Calculate the slice of data to fetch based on page and pageSize
    const start = (page - 1) * pageSize;
    const end = page * pageSize;
    const pageData = data.slice(start, end);

    const articlePromises = pageData.map((id: number) => {
        return axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    });

    const articles = await Promise.all(articlePromises);

    return articles.map(article => article.data as ItemTitle).filter(article => article.type === "story");
}
