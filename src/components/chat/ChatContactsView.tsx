"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@/components/chat/ChatProvider";
import ChatFriendRow from "@/components/chat/ChatFriendRow";
import ChatOtherRow from "@/components/chat/ChatOtherRow";
import { useChatContacts } from "@/hooks/chat/useChatContacts";
import { parseChatError } from "@/lib/chatErrors";

const sectionHeading =
  "px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
const mutedLine = "px-2 py-3 text-sm text-slate-500 dark:text-slate-400";

export default function ChatContactsView() {
  const t = useTranslations("Chat");
  const { isOpen } = useChat();
  const [query, setQuery] = React.useState("");
  const contacts = useChatContacts(query, { enabled: isOpen });
  const friendsHeadingId = React.useId();
  const othersHeadingId = React.useId();

  const { friends, others, serverNow } = contacts;
  const searching = query.trim().length > 0;
  const nothingFound =
    searching &&
    !contacts.isPending &&
    !contacts.isPlaceholderData &&
    !contacts.isDebouncing &&
    friends.length === 0 &&
    others.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 py-2.5">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            maxLength={50}
            className="h-10 pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {contacts.isPending ? (
          <p className={mutedLine}>{t("loading")}</p>
        ) : contacts.isError && !contacts.data ? (
          <p role="alert" className={mutedLine}>
            {t(parseChatError(contacts.error).key)}
          </p>
        ) : (
          <>
            {(friends.length > 0 || !searching) && (
              <section aria-labelledby={friendsHeadingId}>
                <h3 id={friendsHeadingId} className={sectionHeading}>
                  {t("friendsSection")}
                </h3>
                {friends.length === 0 ? (
                  <p className={mutedLine}>{t("noFriends")}</p>
                ) : (
                  <ul>
                    {friends.map((friend) => (
                      <li key={friend.userId}>
                        <ChatFriendRow friend={friend} serverNow={serverNow} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {others.length > 0 && (
              <section aria-labelledby={othersHeadingId}>
                <h3 id={othersHeadingId} className={sectionHeading}>
                  {t("othersSection")}
                </h3>
                <ul>
                  {others.map((contact) => (
                    <li key={contact.userId}>
                      <ChatOtherRow contact={contact} />
                    </li>
                  ))}
                </ul>
                {contacts.hasNextPage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => contacts.fetchNextPage()}
                    // While a new search is loading, the list still shows the
                    // previous search's results: "load more" would page those.
                    disabled={contacts.isFetchingNextPage || contacts.isPlaceholderData}
                  >
                    {contacts.isFetchingNextPage ? t("loading") : t("loadMore")}
                  </Button>
                )}
              </section>
            )}

            {nothingFound && <p className={mutedLine}>{t("noResults")}</p>}
          </>
        )}
      </div>
    </div>
  );
}
