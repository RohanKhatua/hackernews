"use server";

export async function fetchTopStories(limit: number = 5) {
	const topStoriesUrl = "https://hacker-news.firebaseio.com/v0/topstories.json";
	const storyDetailsUrl = (id: number) =>
		`https://hacker-news.firebaseio.com/v0/item/${id}.json`;

	try {
		const response = await fetch(topStoriesUrl);
		const storyIds: number[] = await response.json();

		const topStories = await Promise.all(
			storyIds.slice(0, limit).map(async (id) => {
				const storyResponse = await fetch(storyDetailsUrl(id));
				return storyResponse.json();
			})
		);

		return topStories;
	} catch (error) {
		console.error("Error fetching top stories: ", error);
		return [];
	}
}
