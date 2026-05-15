import type { RedditHeaderProps } from "@/app/domain/reddit-page";

function SpikeMark() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height="10"
      viewBox="0 0 16 16"
      width="10"
    >
      <path d="M8 0L9.6 6.4L16 8L9.6 9.6L8 16L6.4 9.6L0 8L6.4 6.4Z" />
    </svg>
  );
}

export function RedditHeader({ subreddit }: RedditHeaderProps) {
  return (
    <header className="border-b border-hairline pb-8 pt-1">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-primary">
            <SpikeMark />
            Reddit Reader
          </p>
          <h1 className="mt-3 font-serif text-5xl font-normal tracking-[-0.025em] text-ink sm:text-6xl">
            r/{subreddit}
          </h1>
        </div>
        <form className="flex w-full max-w-sm gap-2" action="/">
          <input
            className="min-w-0 flex-1 rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted-soft transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            defaultValue={subreddit}
            name="subreddit"
            placeholder="Enter subreddit…"
          />
          <button
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition hover:bg-primary-active"
            type="submit"
          >
            Load
          </button>
        </form>
      </div>
    </header>
  );
}
