import type { RedditHeaderProps } from "@/app/domain/reddit-page";

export function RedditHeader({ subreddit }: RedditHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-rose-700">
          Reddit JSON reader
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
          r/{subreddit}
        </h1>
      </div>
      <form className="flex w-full max-w-md gap-2" action="/">
        <input
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-rose-700/20 focus:border-rose-700 focus:ring-4"
          defaultValue={subreddit}
          name="subreddit"
          placeholder="Subreddit"
        />
        <button
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          type="submit"
        >
          Load
        </button>
      </form>
    </header>
  );
}
