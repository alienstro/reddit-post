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
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <RedditHeader subreddit={data.subreddit} />

        <CommunityPins
          initialAuth={data.auth}
          initialPins={data.pins}
          subreddit={data.subreddit}
        />

        {data.hotError ? (
          <section className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            {data.hotError}
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
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
