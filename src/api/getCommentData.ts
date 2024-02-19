import axios from "axios";

export async function getCommentData(id: Number): Promise<CommentItem> {
    const response = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    const data: CommentItem = response.data;

    return data;
}
