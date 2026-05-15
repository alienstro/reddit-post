export type SearchParams = Promise<{
  subreddit?: string | string[];
  post?: string | string[];
}>;

export type HotPost = {
  id: string;
  title: string;
  author: string | null;
  score: number;
  num_comments: number;
  created_utc: number | null;
  permalink: string | null;
  url: string | null;
  selftext: string;
  over_18: boolean;
  image_url: string | null;
};

export type Comment = {
  id: string;
  author: string | null;
  body: string;
  score: number;
  created_utc: number | null;
  permalink: string | null;
  depth: number;
  reply_count: number;
  replies: Comment[];
};

export type HotPostsResponse = {
  posts: HotPost[];
  after: string | null;
  error?: string;
};

export type CommentsResponse = {
  comments: Comment[];
  error?: string;
};
