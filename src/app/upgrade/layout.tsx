import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/upgrade",
  },
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
