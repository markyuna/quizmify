"use client";

import React from "react";
import Image from "next/image";
import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const DetailsDialog = () => {
  const t = useTranslations("DetailsDialog");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center rounded-md bg-slate-800 px-2 py-1 text-white">
          {t("whatIsThis")}
          <HelpCircle className="ml-1 h-5 w-5" />
        </button>
      </DialogTrigger>

      <DialogContent className="w-[70vw] max-w-[100vw] md:w-[50vw]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("welcomeTitle")}</DialogTitle>

          <DialogDescription asChild>
            <div>
              <p className="my-2 mt-4">
                {t("intro")}
              </p>

              <hr className="my-4" />

              <div className="my-2">
                <h4 className="text-base font-semibold">{t("builtWith")}</h4>

                <div className="mt-2 grid grid-cols-2 gap-y-3 md:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <Image
                      alt="supabase"
                      src="/planetscale.png"
                      width={35}
                      height={35}
                    />
                    <span>Supabase</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Image
                      alt="nextjs"
                      src="/nextjs.png"
                      width={35}
                      height={35}
                    />
                    <span>Next.js</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Image
                      alt="tailwind"
                      src="/tailwind.png"
                      width={35}
                      height={35}
                    />
                    <span>Tailwind</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Image
                      alt="nextauth"
                      src="/nextauth.png"
                      width={30}
                      height={30}
                    />
                    <span>NextAuth</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Image
                      alt="openai"
                      src="/openai.png"
                      width={30}
                      height={30}
                    />
                    <span>OpenAI</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Image
                      alt="react query"
                      src="/react-query.png"
                      width={30}
                      height={30}
                    />
                    <span>React Query</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Image
                      alt="prisma"
                      src="/prisma.png"
                      width={30}
                      height={30}
                    />
                    <span>Prisma</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Image
                      alt="typescript"
                      src="/typescript.png"
                      width={30}
                      height={30}
                    />
                    <span>TypeScript</span>
                  </div>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default DetailsDialog;