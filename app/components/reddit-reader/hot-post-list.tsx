import {
  formatCount,
  redditPath,
  relativeTime,
} from "@/app/application/reddit-view";
import type { HotPostListProps } from "@/app/domain/reddit-page";

export function HotPostList({
  subreddit,
  posts,
  selectedPost,
}: HotPostListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Hot posts</h2>
        <span className="text-sm text-zinc-500">{posts.length} shown</span>
      </div>
      {posts.map((post) => {
        const selected = selectedPost?.id === post.id;
        return (
          <article
            className={`rounded-md border bg-white p-4 transition ${
              selected
                ? "border-rose-700 shadow-sm"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
            key={post.id}
          >
            <a
              className="block text-base font-semibold leading-6 hover:text-rose-700"
              href={redditPath(subreddit, post.id)}
            >
              {post.title}
            </a>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
              <span>u/{post.author ?? "unknown"}</span>
              <span>{formatCount(post.score)} points</span>
              <span>{formatCount(post.num_comments)} comments</span>
              <span>{relativeTime(post.created_utc)}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
