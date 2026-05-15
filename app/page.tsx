import { RedditReaderPage } from "@/app/components/reddit-reader/reddit-reader-page";
import type { SearchParams } from "@/app/domain/reddit";

export const dynamic = "force-dynamic";

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return <RedditReaderPage searchParams={searchParams} />;
}
