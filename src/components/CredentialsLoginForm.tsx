"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { loginSchema } from "@/schemas/form/auth";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import type { z } from "zod";

type LoginInput = z.infer<typeof loginSchema>;

export default function CredentialsLoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("Auth");

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { mutate: login, isPending } = useMutation({
    mutationFn: async (values: LoginInput) => {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        throw new Error("INVALID_CREDENTIALS");
      }
    },
    onSuccess: () => {
      // A client-side push alone leaves the root layout (navbar) rendered
      // from before sign-in, since Next.js reuses the unchanged layout
      // segment. refresh() re-fetches the server tree so it picks up the
      // new session immediately, matching what a full-page OAuth redirect
      // would do.
      router.push("/dashboard");
      router.refresh();
    },
    onError: () => {
      toast({
        title: t("errorTitle"),
        // Deliberately generic: never confirm/deny whether an email is
        // registered, to avoid account enumeration on the login form.
        description: t("invalidCredentials"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: LoginInput) => {
    login(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("emailLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  className="h-11 rounded-2xl border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/5"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("passwordLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="current-password"
                  className="h-11 rounded-2xl border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/5"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-2xl"
        >
          {isPending ? t("signingIn") : t("signIn")}
        </Button>
      </form>
    </Form>
  );
}
