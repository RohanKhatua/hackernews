import axios from 'axios';

export async function getArticleData(id: Number): Promise<Item> {

    const response = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    const data: Item = response.data;

    return data;
}
