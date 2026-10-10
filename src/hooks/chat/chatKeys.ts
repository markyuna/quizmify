// Query keys for the chat. Everything lives under ["chat"]; the contacts
// key carries the (debounced) search so each query has its own cache.
export const chatKeys = {
  all: ["chat"] as const,
  unreadCount: ["chat", "unread-count"] as const,
  contactsAll: ["chat", "contacts"] as const,
  contacts: (query: string) => ["chat", "contacts", query] as const,
  messages: (userId: string) => ["chat", "messages", userId] as const,
};

// Existing keys owned by FriendsManager / NotificationBell, invalidated when
// a chat action changes friendships.
export const FRIENDS_OVERVIEW_KEY = ["friends-overview"] as const;
export const NOTIFICATIONS_KEY = ["notifications"] as const;
export const NOTIFICATIONS_UNREAD_KEY = ["notifications-unread-count"] as const;
