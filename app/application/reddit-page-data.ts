import {
  firstParam,
  toSummaryComments,
  toSummaryPost,
} from "@/app/application/reddit-view";
import type { AuthState, PinsResponse } from "@/app/domain/auth";
import type { RedditPageData } from "@/app/domain/reddit-page";
import type {
  CommentsResponse,
  HotPostsResponse,
  SearchParams,
} from "@/app/domain/reddit";
import {
  fetchJson,
  fetchSessionJson,
} from "@/app/infrastructure/django-api";

export async function getRedditPageData(
  searchParams: SearchParams,
): Promise<RedditPageData> {
  const params = await searchParams;
  const subreddit = firstParam(params.subreddit, "LocalLLaMA").replace(
    /^r\//i,
    "",
  );
  const selectedPostId = firstParam(params.post, "");

  const hotResult = await fetchJson<HotPostsResponse>(
    `/api/reddit/hot/?subreddit=${encodeURIComponent(subreddit)}&limit=25`,
  );
  const posts = hotResult.data?.posts ?? [];
  const selectedPost =
    posts.find((post) => post.id === selectedPostId) ?? posts[0] ?? null;

  const commentsResult = selectedPost
    ? await fetchJson<CommentsResponse>(
        `/api/reddit/comments/?subreddit=${encodeURIComponent(
          subreddit,
        )}&post_id=${encodeURIComponent(selectedPost.id)}&limit=100&sort=top`,
      )
    : undefined;
  const comments = commentsResult?.data?.comments ?? [];

  const authResult = await fetchSessionJson<AuthState>("/api/auth/me/");
  const auth = authResult.data ?? { authenticated: false, user: null };
  const pinsResult = auth.authenticated
    ? await fetchSessionJson<PinsResponse>("/api/reddit/pins/")
    : undefined;

  return {
    subreddit,
    posts,
    selectedPost,
    comments,
    auth,
    pins: pinsResult?.data?.pins ?? [],
    hotError: hotResult.error,
    commentsError: commentsResult?.error,
    summaryPost: selectedPost ? toSummaryPost(selectedPost) : null,
    summaryComments: toSummaryComments(comments),
  };
}
