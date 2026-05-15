import {
  formatCount,
  relativeTime,
} from "@/app/application/reddit-view";
import type { CommentsPanelProps } from "@/app/domain/reddit-page";

export function CommentsPanel({
  selectedPost,
  comments,
  error,
}: CommentsPanelProps) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Top comments</h2>
        {selectedPost?.permalink ? (
          <a
            className="text-sm font-medium text-rose-700 hover:text-rose-900"
            href={selectedPost.permalink}
            rel="noreferrer"
            target="_blank"
          >
            Open on Reddit
          </a>
        ) : null}
      </div>

      {selectedPost ? (
        <section className="rounded-md border border-zinc-200 bg-white p-5">
          <h3 className="text-xl font-semibold leading-7">
            {selectedPost.title}
          </h3>
          {selectedPost.selftext ? (
            <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {selectedPost.selftext}
            </p>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </section>
      ) : null}

      <div className="space-y-3">
        {comments.map((comment) => (
          <article
            className="rounded-md border border-zinc-200 bg-white p-4"
            key={comment.id}
          >
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
              <span>u/{comment.author ?? "unknown"}</span>
              <span>{formatCount(comment.score)} points</span>
              <span>{relativeTime(comment.created_utc)}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
              {comment.body}
            </p>
          </article>
        ))}
        {!error && selectedPost && comments.length === 0 ? (
          <p className="rounded-md border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            No comments returned for this post.
          </p>
        ) : null}
      </div>
    </div>
  );
}
