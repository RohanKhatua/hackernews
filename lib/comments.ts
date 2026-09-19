import { fetchStory } from "@/lib/hn";

export interface CommentNode {
  id: number;
  by?: string;
  time?: number;
  text?: string;
  kids: CommentNode[];
}

export interface CommentTreeOptions {
  /** Top-level comments to fetch. */
  maxTop?: number;
  /** Children fetched per comment at each level. */
  maxChildrenPerLevel?: number;
  /** How deep to recurse before linking out to HN. */
  maxDepth?: number;
}

const DEFAULTS: Required<CommentTreeOptions> = {
  maxTop: 15,
  maxChildrenPerLevel: 5,
  maxDepth: 3,
};

function isRenderable(comment: {
  text?: string;
  kids?: number[];
  deleted?: boolean;
  dead?: boolean;
}): boolean {
  if (comment.deleted || comment.dead) return false;
  return Boolean(comment.text || comment.kids?.length);
}

/**
 * Fetches a bounded slice of an HN comment tree server-side so the comment
 * text is present in the initial HTML (SEO + first paint). Depth and breadth
 * are capped to keep the payload and upstream request count sane; HN itself
 * remains the place to read the full thread.
 */
export async function fetchCommentTree(
  ids: number[],
  options: CommentTreeOptions = {},
): Promise<CommentNode[]> {
  const { maxTop, maxChildrenPerLevel, maxDepth } = { ...DEFAULTS, ...options };

  async function loadLevel(levelIds: number[], depth: number): Promise<CommentNode[]> {
    const batch = levelIds.slice(0, maxChildrenPerLevel);
    const comments = await Promise.all(batch.map((id) => fetchStory(id)));

    const nodes: CommentNode[] = [];
    for (const comment of comments) {
      if (!comment?.id || !isRenderable(comment)) continue;

      const kids =
        depth < maxDepth && comment.kids?.length
          ? await loadLevel(comment.kids, depth + 1)
          : [];

      nodes.push({
        id: comment.id,
        by: comment.by,
        time: comment.time,
        text: comment.text,
        kids,
      });
    }
    return nodes;
  }

  return loadLevel(ids.slice(0, maxTop), 1);
}
