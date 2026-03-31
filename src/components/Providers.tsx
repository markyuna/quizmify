"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type ProvidersProps = React.PropsWithChildren<ThemeProviderProps>;

export default function Providers({ children, ...props }: ProvidersProps) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem {...props}>
          {children}
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}