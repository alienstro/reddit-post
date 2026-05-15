import type { Comment, HotPost } from "@/app/domain/reddit";
import type { SummaryComment, SummaryPost } from "@/app/domain/summary";

export function firstParam(
  value: string | string[] | undefined,
  fallback: string,
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
}

export function redditPath(subreddit: string, postId?: string) {
  const params = new URLSearchParams({ subreddit });
  if (postId) {
    params.set("post", postId);
  }
  return `/?${params.toString()}`;
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

export function relativeTime(timestamp: number | null) {
  if (!timestamp) {
    return "unknown time";
  }

  const secondsAgo = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
  const hoursAgo = Math.floor(secondsAgo / 3600);
  if (hoursAgo < 1) {
    return "less than 1h ago";
  }
  if (hoursAgo < 24) {
    return `${hoursAgo}h ago`;
  }
  return `${Math.floor(hoursAgo / 24)}d ago`;
}

export function toSummaryPost(post: HotPost): SummaryPost {
  return {
    title: post.title,
    author: post.author,
    score: post.score,
    num_comments: post.num_comments,
    url: post.url,
    selftext: post.selftext,
  };
}

export function toSummaryComments(comments: Comment[]): SummaryComment[] {
  return comments.map((comment) => ({
    author: comment.author,
    body: comment.body,
    score: comment.score,
  }));
}
