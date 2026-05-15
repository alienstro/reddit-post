export type SummaryPost = {
  title: string;
  author: string | null;
  score: number;
  num_comments: number;
  url: string | null;
  selftext: string;
};

export type SummaryComment = {
  author: string | null;
  body: string;
  score: number;
};

export type SummarizerProps = {
  post: SummaryPost | null;
  comments: SummaryComment[];
};
