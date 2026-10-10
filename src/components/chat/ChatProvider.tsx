"use client";

import * as React from "react";

type ChatContextValue = {
  isOpen: boolean;
  // The conversation shown in the panel; null = the contacts list.
  activeUserId: string | null;
  open: () => void;
  // restoreFocus defaults to true (Esc, the X button). A click outside
  // passes false: focus belongs to whatever the user just clicked.
  close: (options?: { restoreFocus?: boolean }) => void;
  // Whether the bubble should take focus back after the last close.
  restoreFocusOnClose: boolean;
  openConversation: (userId: string) => void;
  back: () => void;
  // Unsent text per conversation, in memory only (never persisted).
  getDraft: (userId: string) => string;
  setDraft: (userId: string, text: string) => void;
  clearDrafts: () => void;
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
  const [restoreFocusOnClose, setRestoreFocusOnClose] = React.useState(true);

  // Stable identities, so consumers can list them as effect dependencies.
  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback((options?: { restoreFocus?: boolean }) => {
    setRestoreFocusOnClose(options?.restoreFocus ?? true);
    setIsOpen(false);
  }, []);
  const openConversation = React.useCallback((userId: string) => {
    setActiveUserId(userId);
    setIsOpen(true);
  }, []);
  const back = React.useCallback(() => setActiveUserId(null), []);

  // Drafts live in a ref: typing must not re-render every context consumer.
  // Memory only -- gone on reload, and cleared on sign-out by ChatRoot.
  const draftsRef = React.useRef(new Map<string, string>());
  const getDraft = React.useCallback((userId: string) => draftsRef.current.get(userId) ?? "", []);
  const setDraft = React.useCallback((userId: string, text: string) => {
    if (text) draftsRef.current.set(userId, text);
    else draftsRef.current.delete(userId);
  }, []);
  const clearDrafts = React.useCallback(() => draftsRef.current.clear(), []);

  const value = React.useMemo<ChatContextValue>(
    () => ({
      isOpen,
      activeUserId,
      open,
      close,
      restoreFocusOnClose,
      openConversation,
      back,
      getDraft,
      setDraft,
      clearDrafts,
    }),
    [isOpen, activeUserId, open, close, restoreFocusOnClose, openConversation, back, getDraft, setDraft, clearDrafts]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const context = React.useContext(ChatContext);
  if (!context) throw new Error("useChat must be used inside <ChatProvider>");
  return context;
}
