import axios from "axios";

export type ChatErrorMessageKey =
  | "errors.unauthorized"
  | "errors.invalidInput"
  | "errors.userNotFound"
  | "errors.cannotTargetSelf"
  | "errors.notFriends"
  | "errors.blockedByYou"
  | "errors.rateLimited"
  | "errors.friendRequestsRateLimited"
  | "errors.messageNotFound"
  | "errors.cannotReportOwnMessage"
  | "errors.alreadyReported"
  | "errors.friendRequestNotAllowed"
  | "errors.tooManyPendingRequests"
  | "errors.generic";

const CODE_TO_KEY: Record<string, ChatErrorMessageKey> = {
  UNAUTHORIZED: "errors.unauthorized",
  INVALID_INPUT: "errors.invalidInput",
  USER_NOT_FOUND: "errors.userNotFound",
  CANNOT_TARGET_SELF: "errors.cannotTargetSelf",
  NOT_FRIENDS: "errors.notFriends",
  BLOCKED_BY_YOU: "errors.blockedByYou",
  MESSAGE_NOT_FOUND: "errors.messageNotFound",
  CANNOT_REPORT_OWN_MESSAGE: "errors.cannotReportOwnMessage",
  ALREADY_REPORTED: "errors.alreadyReported",
  FRIEND_REQUEST_NOT_ALLOWED: "errors.friendRequestNotAllowed",
  TOO_MANY_PENDING_REQUESTS: "errors.tooManyPendingRequests",
};

export type ParsedChatError = {
  code: string | null;
  key: ChatErrorMessageKey;
  values?: { seconds: number };
};

/**
 * Maps an /api/chat/* or /api/friends error to a key in the Chat namespace,
 * used as t(parsed.key, parsed.values). RATE_LIMITED is shared: chat sends
 * carry retryAfterMs (-> "try again in N s"), friend requests don't (-> the
 * daily-limit text). 401 is matched on status, since /api/friends answers
 * { error: "Unauthorized" } rather than a code. Anything else is generic.
 */
export function parseChatError(error: unknown): ParsedChatError {
  if (!axios.isAxiosError(error)) return { code: null, key: "errors.generic" };
  if (error.response?.status === 401) return { code: "UNAUTHORIZED", key: "errors.unauthorized" };

  const data = error.response?.data as { error?: unknown; retryAfterMs?: unknown } | undefined;
  const code = typeof data?.error === "string" ? data.error : null;

  if (code === "RATE_LIMITED") {
    return typeof data?.retryAfterMs === "number"
      ? { code, key: "errors.rateLimited", values: { seconds: Math.max(1, Math.ceil(data.retryAfterMs / 1000)) } }
      : { code, key: "errors.friendRequestsRateLimited" };
  }
  return { code, key: (code && CODE_TO_KEY[code]) || "errors.generic" };
}

export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

/** 4xx means "this won't fix itself": stop polling and don't retry. */
export function isClientError(error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return status !== undefined && status >= 400 && status < 500;
}

export function retryUnlessClientError(failureCount: number, error: unknown): boolean {
  return !isClientError(error) && failureCount < 2;
}
