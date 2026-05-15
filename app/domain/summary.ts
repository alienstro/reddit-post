export type SummaryPost = {
  title: string;
  author: string | null;
  score: number;
  num_comments: number;
  url: string | null;
  selftext: string;
  image_url: string | null;
};

export type SummaryComment = {
  author: string | null;
  body: string;
  score: number;
  replies: SummaryComment[];
};

export type SummarizerProps = {
  post: SummaryPost | null;
  comments: SummaryComment[];
};

export type SummaryPromptOptions = {
  commentLimit: number;
  flattenedCommentLimit: number;
  postBodyCharLimit: number;
  commentCharLimit: number;
};
