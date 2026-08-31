"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import type { z } from "zod";

import { contactSchema } from "@/schemas/form/contact";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type ContactInput = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const t = useTranslations("ContactPage");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "", website: "" },
  });

  const onSubmit = async (values: ContactInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data: { success: boolean } = await res.json();

      if (data.success) {
        toast({ title: t("success") });
        form.reset();
      } else {
        toast({ title: t("error"), variant: "destructive" });
      }
    } catch {
      toast({ title: t("error"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-cyan-50 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950">
      <div className="relative z-10 w-full max-w-md">
        <h1 className="mb-8 text-center text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {t("title")}
        </h1>

        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Honeypot: hidden from real users via CSS, never shown, never
                  filled by a human. Bots that blindly fill every field trip it. */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  {...form.register("website")}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {t("name")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="name" />
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
                      {t("email")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {t("subject")}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {t("message")}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-2xl">
                {isSubmitting ? t("sending") : t("submit")}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
