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
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl font-normal tracking-[-0.02em] text-ink">
          Hot posts
        </h2>
        <span className="font-sans text-xs font-medium uppercase tracking-[0.1em] text-muted-soft">
          {posts.length} shown
        </span>
      </div>
      <div className="space-y-2">
        {posts.map((post) => {
          const selected = selectedPost?.id === post.id;
          return (
            <article
              className={`rounded-lg border bg-surface-card p-5 transition ${
                selected
                  ? "border-primary shadow-sm"
                  : "border-hairline hover:border-surface-cream-strong"
              }`}
              key={post.id}
            >
              <a
                className={`block font-sans text-sm font-medium leading-6 transition ${
                  selected ? "text-primary" : "text-ink hover:text-primary"
                }`}
                href={redditPath(subreddit, post.id)}
              >
                {post.title}
              </a>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs text-muted">
                <span>u/{post.author ?? "unknown"}</span>
                <span>{formatCount(post.score)} pts</span>
                <span>{formatCount(post.num_comments)} comments</span>
                <span>{relativeTime(post.created_utc)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
