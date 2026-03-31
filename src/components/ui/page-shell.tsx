import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export default function PageShell({ children, className }: PageShellProps) {
  return (
    <main className={cn("relative min-h-screen px-4 py-8 md:px-8", className)}>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </main>
  );
}