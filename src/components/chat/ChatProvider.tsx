"use client";

import * as React from "react";

type ChatContextValue = {
  isOpen: boolean;
  // The conversation shown in the panel; null = the contacts list.
  activeUserId: string | null;
  open: () => void;
  close: () => void;
  openConversation: (userId: string) => void;
  back: () => void;
};

const ChatContext = React.createContext<ChatContextValue | null>(null);

/**
 * Panel state for the friends chat, no UI. Closing keeps activeUserId, so
 * reopening returns to the same conversation; polling still stops, since
 * hooks gate on isOpen (useChatMessages' `active`, useChatContacts'
 * `enabled`). Lives above the page tree so any page (e.g. /friends) can
 * call openConversation().
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeUserId, setActiveUserId] = React.useState<string | null>(null);

  const value = React.useMemo<ChatContextValue>(
    () => ({
      isOpen,
      activeUserId,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      openConversation: (userId) => {
        setActiveUserId(userId);
        setIsOpen(true);
      },
      back: () => setActiveUserId(null),
    }),
    [isOpen, activeUserId]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const context = React.useContext(ChatContext);
  if (!context) throw new Error("useChat must be used inside <ChatProvider>");
  return context;
}
