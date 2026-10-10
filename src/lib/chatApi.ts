import { NextResponse } from "next/server";
import { z } from "zod";

import type { ChatAccess } from "@/lib/chat";

/**
 * Stable error identifiers for /api/chat/*. They're codes, not copy: the
 * chat UI maps each one to a translated string (fr/es/en), so nothing here
 * is ever shown to a user as-is.
 */
export type ChatErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_INPUT"
  | "USER_NOT_FOUND"
  | "CANNOT_TARGET_SELF"
  | "NOT_FRIENDS"
  | "BLOCKED_BY_YOU"
  | "RATE_LIMITED"
  | "MESSAGE_NOT_FOUND"
  | "CANNOT_REPORT_OWN_MESSAGE"
  | "ALREADY_REPORTED";

export function chatError(code: ChatErrorCode, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: code, ...extra }, { status });
}

/** blocked_by_them deliberately reads as NOT_FRIENDS -- see ChatAccess in src/lib/chat.ts. */
export function chatAccessError(access: Exclude<ChatAccess, "ok">) {
  return access === "blocked_by_me" ? chatError("BLOCKED_BY_YOU", 403) : chatError("NOT_FRIENDS", 403);
}

export const idParamSchema = z.string().min(1).max(64);
