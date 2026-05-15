import { getRedditPageData } from "@/app/application/reddit-page-data";
import { CommunityPins } from "@/app/components/community-pins";
import { PostSummarizerFab } from "@/app/components/post-summarizer-fab";
import { CommentsPanel } from "@/app/components/reddit-reader/comments-panel";
import { HotPostList } from "@/app/components/reddit-reader/hot-post-list";
import { RedditHeader } from "@/app/components/reddit-reader/reddit-header";
import type { SearchParams } from "@/app/domain/reddit";

export async function RedditReaderPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const data = await getRedditPageData(searchParams);

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <RedditHeader subreddit={data.subreddit} />

        <CommunityPins
          initialAuth={data.auth}
          initialPins={data.pins}
          subreddit={data.subreddit}
        />

        {data.hotError ? (
          <section className="rounded-lg border border-error-border bg-error-surface px-4 py-3 text-sm text-error-text">
            {data.hotError}
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <HotPostList
            posts={data.posts}
            selectedPost={data.selectedPost}
            subreddit={data.subreddit}
          />
          <CommentsPanel
            comments={data.comments}
            error={data.commentsError}
            selectedPost={data.selectedPost}
          />
        </section>
      </div>
      <PostSummarizerFab
        comments={data.summaryComments}
        post={data.summaryPost}
      />
    </main>
  );
}
