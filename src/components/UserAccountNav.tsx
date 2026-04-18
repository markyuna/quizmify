"use client";

import type { User } from "next-auth";
import Link from "next/link";
import React from "react";
import { signOut } from "next-auth/react";
import { History, LayoutDashboard, LogOut, Sparkles } from "lucide-react";

import UserAvatar from "./UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type Props = {
  user: Pick<User, "name" | "image" | "email">;
};

const UserAccountNav = ({ user }: Props) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none ring-offset-background transition-transform duration-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-2"
          aria-label="Open user menu"
        >
          <UserAvatar
            className="h-10 w-10 border border-slate-200 shadow-sm dark:border-white/10 dark:shadow-none"
            user={{
              name: user.name || null,
              image: user.image || null,
            }}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-72 rounded-3xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85"
      >
        <div className="flex items-center gap-3 rounded-2xl px-3 py-3">
          <UserAvatar
            className="h-11 w-11 border border-slate-200 shadow-sm dark:border-white/10 dark:shadow-none"
            user={{
              name: user.name || null,
              image: user.image || null,
            }}
          />

          <div className="min-w-0 flex-1">
            {user.name && (
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {user.name}
              </p>
            )}

            {user.email && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />

        <DropdownMenuItem
          asChild
          className="mt-1 cursor-pointer rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus:bg-white/10"
        >
          <Link href="/dashboard" className="flex items-center gap-3">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus:bg-white/10"
        >
          <Link href="/quiz" className="flex items-center gap-3">
            <Sparkles className="h-4 w-4" />
            <span>Quiz</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          asChild
          className="cursor-pointer rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white dark:focus:bg-white/10"
        >
          <Link href="/history" className="flex items-center gap-3">
            <History className="h-4 w-4" />
            <span>History</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            signOut().catch(console.error);
          }}
          className="cursor-pointer rounded-2xl px-3 py-2.5 text-sm font-medium text-rose-600 outline-none transition hover:bg-rose-50 hover:text-rose-700 focus:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 dark:focus:bg-rose-500/10"
        >
          <div className="flex items-center gap-3">
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserAccountNav;