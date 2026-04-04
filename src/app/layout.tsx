import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/Navbar";
import ThemeProvider from "@/components/ThemeProvider";
import QueryProvider from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Quizmify",
    template: "%s | Quizmify",
  },
  description: "Quiz yourself on anything with AI-powered quizzes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          inter.className,
          "min-h-screen overflow-x-hidden bg-background font-sans text-foreground antialiased transition-colors duration-300"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <div className="relative isolate flex min-h-screen flex-col">
              <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-background" />
                <div className="absolute left-[-10%] top-0 h-[420px] w-[420px] rounded-full bg-violet-500/15 blur-3xl" />
                <div className="absolute right-[-10%] top-[10%] h-[360px] w-[360px] rounded-full bg-cyan-500/15 blur-3xl" />
                <div className="absolute bottom-[-10%] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
                <div className="grid-overlay absolute inset-0 opacity-30 dark:opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
              </div>

              <div className="relative z-10 min-h-screen">
                <Navbar />
                <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
                  {children}
                </main>
              </div>

              <Toaster />
              <SpeedInsights />
            </div>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}