import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          inter.className,
          "min-h-screen overflow-x-hidden bg-background font-sans text-foreground antialiased transition-colors duration-300"
        )}
      >
        <NextIntlClientProvider>
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

                <div className="relative z-10 flex min-h-screen flex-col">
                  <Navbar />
                  <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
                    {children}
                  </main>
                  <Footer />
                </div>

                <Toaster />
                <SpeedInsights />
              </div>
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}