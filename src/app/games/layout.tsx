export const metadata = {
  // The root layout already applies the "%s | Quizmify" template, so a plain
  // "Games" here renders as "Games | Quizmify" -- not "Games | Quizmify | Quizmify".
  title: "Games",
};

// A separate server-component layout purely so `metadata` can be exported --
// the page itself is "use client" (useState/useSearchParams/useSession),
// and a client component can't export metadata directly.
export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
