"use client";

import * as React from "react";
import axios from "axios";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";

import { registerSchema } from "@/schemas/form/auth";
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

const formSchema = registerSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterInput = z.infer<typeof formSchema>;

export default function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("Auth");

  const form = useForm<RegisterInput>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const { mutate: register, isPending } = useMutation({
    mutationFn: async (values: RegisterInput) => {
      await axios.post("/api/auth/register", {
        name: values.name,
        email: values.email,
        password: values.password,
      });

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (!result || result.error) {
        throw new Error("SIGNIN_FAILED_AFTER_REGISTER");
      }
    },
    onSuccess: () => {
      // See CredentialsLoginForm for why refresh() is needed alongside push().
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: t("errorTitle"),
          description: t("emailInUse"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("errorTitle"),
        description: t("registerError"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: RegisterInput) => {
    register(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("nameLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="name"
                  className="h-11 rounded-2xl border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/5"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  autoComplete="new-password"
                  className="h-11 rounded-2xl border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/5"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("confirmPasswordLabel")}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="new-password"
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
          {isPending ? t("creatingAccount") : t("createAccount")}
        </Button>
      </form>
    </Form>
  );
}
