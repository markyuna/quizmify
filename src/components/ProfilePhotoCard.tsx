"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, ImageUp, PawPrint, UserRound } from "lucide-react";

import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";

// Mirrors AVATAR_MAX_BYTES / AVATAR_ALLOWED_TYPES in src/lib/profilePhoto.ts
// (server-only, it pulls in the Supabase admin client). The server re-checks
// both from the file's real bytes; this is just early feedback.
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ProfilePhotoCardProps = {
  name: string | null;
  currentImage: string | null;
  // The user's own assigned mascot, or null if they haven't taken the test.
  mascot: { image: string; name: string } | null;
  googleImage: string | null;
};

type PhotoAction = { kind: "upload"; file: File } | { kind: "mascot" } | { kind: "google" } | { kind: "remove" };

function PhotoCircle({ src, alt, className }: { src: string; alt: string; className: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10", className)}>
      <Image src={src} alt={alt} fill sizes="80px" unoptimized referrerPolicy="no-referrer" className="object-cover" />
    </div>
  );
}

function OptionTile({
  selected,
  disabled,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled || selected}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl p-2 transition disabled:cursor-default",
        selected ? "bg-violet-50 ring-2 ring-violet-400 dark:bg-violet-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5",
        disabled && !selected && "opacity-60"
      )}
    >
      <div className="relative">
        {children}
        {selected && (
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white shadow">
            <Check className="h-2.5 w-2.5" />
          </span>
        )}
      </div>
      <span className="max-w-[6rem] truncate text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</span>
    </button>
  );
}

/**
 * Profile photo picker on /account, open to every user: upload a custom
 * photo, use the personality mascot they were assigned (only theirs), restore
 * their Google picture, or clear it. Writes go through /api/user/avatar, then
 * the JWT is refreshed so the header avatar updates without a re-login.
 */
export default function ProfilePhotoCard({ name, currentImage, mascot, googleImage }: ProfilePhotoCardProps) {
  const t = useTranslations("Account");
  const router = useRouter();
  const { toast } = useToast();
  const { update } = useSession();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const { mutate: applyPhoto, isPending } = useMutation({
    mutationFn: async (action: PhotoAction) => {
      switch (action.kind) {
        case "upload": {
          const formData = new FormData();
          formData.append("file", action.file);
          return axios.post("/api/user/avatar", formData);
        }
        case "mascot":
        case "google":
          return axios.patch("/api/user/avatar", { source: action.kind });
        case "remove":
          return axios.delete("/api/user/avatar");
      }
    },
    onSuccess: async () => {
      setPendingFile(null);
      await update({ refreshProfile: true });
      router.refresh();
      toast({ title: t("photoUpdated") });
    },
    onError: (error) => {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const title =
        status === 413 ? t("photoTooLarge") : status === 415 ? t("photoInvalidType") : t("somethingWentWrong");
      toast({ title, variant: "destructive" });
    },
  });

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: t("photoInvalidType"), variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: t("photoTooLarge"), variant: "destructive" });
      return;
    }
    setPendingFile(file);
  };

  const shownImage = previewUrl ?? currentImage;
  const initial = (name?.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("photoTitle")}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("photoSubtitle")}</p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        {shownImage ? (
          <PhotoCircle src={shownImage} alt={t("photoCurrentAlt")} className="h-20 w-20" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-violet-100 text-2xl font-bold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            {initial}
          </div>
        )}

        <div className="flex flex-col items-center gap-2 sm:items-start">
          {pendingFile ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => applyPhoto({ kind: "upload", file: pendingFile })}
                className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
              >
                {isPending ? t("photoSaving") : t("photoSave")}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setPendingFile(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                {t("photoCancel")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <ImageUp className="h-4 w-4" />
              {t("photoUpload")}
            </button>
          )}
          <p className="text-[11px] text-slate-400">{t("photoHint")}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={onFileSelected}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {mascot ? (
          <OptionTile
            selected={!pendingFile && currentImage === mascot.image}
            disabled={isPending}
            onClick={() => applyPhoto({ kind: "mascot" })}
            label={mascot.name}
          >
            <PhotoCircle src={mascot.image} alt={mascot.name} className="h-12 w-12" />
          </OptionTile>
        ) : (
          <Link
            href="/quel-animal-es-tu"
            className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-pink-300 text-pink-400 dark:border-pink-400/40">
              <PawPrint className="h-5 w-5" />
            </div>
            <span className="max-w-[6rem] text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {t("photoMascotCta")}
            </span>
          </Link>
        )}

        {googleImage && (
          <OptionTile
            selected={!pendingFile && currentImage === googleImage}
            disabled={isPending}
            onClick={() => applyPhoto({ kind: "google" })}
            label={t("photoGoogle")}
          >
            <PhotoCircle src={googleImage} alt={t("photoGoogle")} className="h-12 w-12" />
          </OptionTile>
        )}

        <OptionTile
          selected={!pendingFile && currentImage === null}
          disabled={isPending}
          onClick={() => applyPhoto({ kind: "remove" })}
          label={t("photoNone")}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-white/20">
            <UserRound className="h-5 w-5" />
          </div>
        </OptionTile>
      </div>
    </div>
  );
}
