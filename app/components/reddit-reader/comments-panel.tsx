import type { ReactNode } from "react";

import {
  formatCount,
  relativeTime,
} from "@/app/application/reddit-view";
import type { Comment } from "@/app/domain/reddit";
import type { CommentsPanelProps } from "@/app/domain/reddit-page";

export function CommentsPanel({
  selectedPost,
  comments,
  error,
}: CommentsPanelProps) {
  return (
    <div className="min-w-0 space-y-4 rounded-xl bg-surface-dark p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-normal tracking-[-0.02em] text-on-dark">
          Top comments
        </h2>
        {selectedPost?.permalink ? (
          <a
            className="font-sans text-xs font-medium uppercase tracking-[0.1em] text-accent-teal transition hover:text-on-dark"
            href={selectedPost.permalink}
            rel="noreferrer"
            target="_blank"
          >
            Open on Reddit ↗
          </a>
        ) : null}
      </div>

      {selectedPost ? (
        <section className="rounded-lg border border-surface-dark-elevated bg-surface-dark-elevated p-5">
          <h3 className="font-serif text-2xl font-normal leading-snug tracking-[-0.02em] text-on-dark">
            {selectedPost.title}
          </h3>
          {selectedPost.selftext ? (
            <ExpandablePostBody text={selectedPost.selftext} />
          ) : null}
          {selectedPost.image_url ? (
            <a
              className="mt-4 block overflow-hidden rounded-lg border border-surface-dark-soft bg-surface-dark-soft"
              href={selectedPost.image_url}
              rel="noreferrer"
              target="_blank"
            >
              <img
                alt={selectedPost.title}
                className="max-h-80 w-full object-contain"
                src={selectedPost.image_url}
              />
            </a>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-lg border border-surface-dark-elevated bg-surface-dark-elevated px-4 py-3 font-sans text-sm text-on-dark-soft">
          {error}
        </section>
      ) : null}

      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentCard comment={comment} key={comment.id} />
        ))}
        {!error && selectedPost && comments.length === 0 ? (
          <p className="rounded-lg border border-surface-dark-elevated bg-surface-dark-elevated px-4 py-3 font-sans text-sm text-on-dark-soft">
            No comments returned for this post.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ExpandablePostBody({ text }: { text: string }) {
  const shouldClamp = text.length > 420 || text.split(/\r?\n/).length > 6;

  if (!shouldClamp) {
    return <PostMarkdown text={text} />;
  }

  return <ExpandablePostBodyContent text={text} />;
}

function ExpandablePostBodyContent({ text }: { text: string }) {
  return (
    <details className="group mt-3">
      <summary className="list-none font-sans text-sm font-medium text-accent-teal hover:text-on-dark">
        <span className="group-open:hidden">Read more</span>
        <span className="hidden group-open:inline">Show less</span>
      </summary>
      <PostMarkdown text={text} />
    </details>
  );
}

function PostMarkdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) {
      return;
    }
    elements.push(
      <ul className="my-3 list-disc space-y-1 pl-5" key={`list-${elements.length}`}>
        {listItems.map((item, index) => (
          <li className="font-sans text-sm leading-6 text-on-dark-soft" key={index}>
            <InlineMarkdown text={item} />
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }

    flushList();

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h4
          className="mt-5 font-serif text-lg font-normal tracking-[-0.01em] text-on-dark first:mt-3"
          key={index}
        >
          <InlineMarkdown text={trimmed.replace(/^#\s+/, "")} />
        </h4>,
      );
      return;
    }

    elements.push(
      <p
        className="my-3 font-sans [overflow-wrap:anywhere] text-sm leading-6 text-on-dark-soft"
        key={index}
      >
        <InlineMarkdown text={trimmed} />
      </p>,
    );
  });
  flushList();

  return <div className="mt-3 min-w-0">{elements}</div>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|https?:\/\/\S+)/g);
  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeHttpUrl(decodeHtml(link[2]));
      if (!href) {
        return (
          <span className="[overflow-wrap:anywhere]" key={index}>
            {decodeHtml(link[1])}
          </span>
        );
      }

      return (
        <a
          className="break-all font-medium text-accent-teal hover:text-on-dark"
          href={href}
          key={index}
          rel="noreferrer"
          target="_blank"
        >
          {decodeHtml(link[1])}
        </a>
      );
    }

    if (/^https?:\/\/\S+$/.test(part)) {
      const href = safeHttpUrl(decodeHtml(part));
      if (!href) {
        return (
          <span className="[overflow-wrap:anywhere]" key={index}>
            {decodeHtml(part)}
          </span>
        );
      }

      return (
        <a
          className="break-all font-medium text-accent-teal hover:text-on-dark"
          href={href}
          key={index}
          rel="noreferrer"
          target="_blank"
        >
          {decodeHtml(part)}
        </a>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong className="font-medium text-on-dark" key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return (
      <span className="[overflow-wrap:anywhere]" key={index}>
        {decodeHtml(part)}
      </span>
    );
  });
}

function decodeHtml(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function CommentCard({ comment }: { comment: Comment }) {
  const replies = comment.replies ?? [];
  return (
    <article className="rounded-lg border border-surface-dark-elevated bg-surface-dark-elevated p-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs text-on-dark-soft">
        <span className="font-medium text-on-dark">u/{comment.author ?? "unknown"}</span>
        <span>{formatCount(comment.score)} pts</span>
        <span>{relativeTime(comment.created_utc)}</span>
      </div>
      <PostMarkdown text={comment.body} />
      {replies.length > 0 ? (
        <div className="mt-4 min-w-0 space-y-3 border-l border-surface-dark-soft pl-4">
          {replies.map((reply) => (
            <ReplyCard comment={reply} key={reply.id} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ReplyCard({ comment }: { comment: Comment }) {
  const replies = comment.replies ?? [];
  return (
    <div className="min-w-0 rounded-lg bg-surface-dark-soft p-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs text-on-dark-soft">
        <span className="font-medium text-on-dark">u/{comment.author ?? "unknown"}</span>
        <span>{formatCount(comment.score)} pts</span>
        <span>{relativeTime(comment.created_utc)}</span>
      </div>
      <PostMarkdown text={comment.body} />
      {replies.length > 0 ? (
        <div className="mt-3 min-w-0 space-y-3 border-l border-surface-dark-elevated pl-3">
          {replies.map((reply) => (
            <ReplyCard comment={reply} key={reply.id} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
