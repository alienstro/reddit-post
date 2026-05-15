import type { AuthState, Pin } from "@/app/domain/auth";
import type { Comment, HotPost } from "@/app/domain/reddit";
import type { SummaryComment, SummaryPost } from "@/app/domain/summary";

export type RedditPageData = {
  subreddit: string;
  posts: HotPost[];
  selectedPost: HotPost | null;
  comments: Comment[];
  auth: AuthState;
  pins: Pin[];
  hotError?: string;
  commentsError?: string;
  summaryPost: SummaryPost | null;
  summaryComments: SummaryComment[];
};

export type RedditHeaderProps = {
  subreddit: string;
};

export type HotPostListProps = {
  subreddit: string;
  posts: HotPost[];
  selectedPost: HotPost | null;
};

export type CommentsPanelProps = {
  selectedPost: HotPost | null;
  comments: Comment[];
  error?: string;
};
