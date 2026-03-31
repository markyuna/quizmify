"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import {
  ThemeProvider,
  type ThemeProviderProps,
} from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type ProvidersProps = React.PropsWithChildren<ThemeProviderProps>;

export default function Providers({ children, ...themeProps }: ProvidersProps) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider {...themeProps}>{children}</ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}