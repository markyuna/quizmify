import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

/**
 * The Neurons ledger moved into /history as a tab. This route stays only
 * to keep old / cached links working -- it forwards to the tab, carrying
 * an existing ?page= through so a bookmarked deep link still lands right.
 */
export default async function NeuronsHistoryRedirect({ searchParams }: PageProps) {
  const { page } = await searchParams;
  redirect(
    page
      ? `/history?tab=neurons&page=${encodeURIComponent(page)}`
      : "/history?tab=neurons"
  );
}
