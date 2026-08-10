import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import QueryProvider from "@/components/QueryProvider";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import IdleTimeoutProvider from "@/components/IdleTimeoutProvider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import TimezoneSync from "@/components/TimezoneSync";
import ReferralCapture from "@/components/ReferralCapture";
import GuestRoundClaim from "@/components/GuestRoundClaim";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { getThemeInitScript } from "@/lib/themeInitScript";
import { THEME_STORAGE_KEY } from "@/lib/themeConfig";
import { cn } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const SITE_NAME = "Quizmify";
const DESCRIPTION =
  "Quizmify is an AI-powered quiz platform that generates quizzes on any topic in seconds, tracks your performance, and turns your mistakes into practice opportunities.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: "%s | Quizmify",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          // Runs before hydration as part of the raw server-rendered HTML,
          // so it prevents a flash of the wrong theme without React ever
          // creating this script node on the client (see ThemeProvider.tsx).
          dangerouslySetInnerHTML={{ __html: getThemeInitScript(THEME_STORAGE_KEY, "dark") }}
        />
      </head>
      <body
        className={cn(
          inter.variable,
          inter.className,
          "min-h-screen overflow-x-hidden bg-background font-sans text-foreground antialiased transition-colors duration-300"
        )}
      >
        <NextIntlClientProvider>
          <ThemeProvider defaultTheme="dark" disableTransitionOnChange>
            <AuthSessionProvider>
              <QueryProvider>
                <TooltipProvider delayDuration={200}>
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
                    <Analytics />
                    <TimezoneSync />
                    <ReferralCapture />
                    <GuestRoundClaim />
                    <IdleTimeoutProvider />
                  </div>
                </TooltipProvider>
              </QueryProvider>
            </AuthSessionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}