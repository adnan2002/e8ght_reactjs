import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.jsx";
import { useAuthenticatedFetch } from "../../hooks/useAuthenticatedFetch.jsx";

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "";
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const formatDate = (rawValue) => {
  if (!rawValue) return "";
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return rawValue;
  return parsed.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

const formatTime = (rawValue) => {
  if (!rawValue) return "";
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(rawValue)) {
    return rawValue.slice(0, 5);
  }
  return rawValue;
};

const getInitial = (name) => {
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim().charAt(0).toUpperCase();
  }
  return "?";
};

const extractContacts = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload.contacts)) return payload.contacts;
  if (Array.isArray(payload)) return payload;
  return [];
};

const extractChats = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload.chats)) return payload.chats;
  if (Array.isArray(payload)) return payload;
  return [];
};

const ContactSkeleton = () => (
  <div className="animate-pulse flex items-center gap-3 p-3">
    <div className="h-12 w-12 rounded-full bg-slate-200" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-3 w-32 rounded bg-slate-200" />
    </div>
  </div>
);

const MessageSkeleton = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="flex justify-start">
      <div className="h-16 w-48 rounded-2xl bg-slate-200" />
    </div>
    <div className="flex justify-end">
      <div className="h-12 w-40 rounded-2xl bg-slate-200" />
    </div>
    <div className="flex justify-start">
      <div className="h-20 w-56 rounded-2xl bg-slate-200" />
    </div>
  </div>
);

export const ChatPage = () => {
  const { user } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  const [searchParams, setSearchParams] = useSearchParams();

  const [contacts, setContacts] = useState([]);
  const [contactsStatus, setContactsStatus] = useState("idle");
  const [selectedContactId, setSelectedContactId] = useState(null);

  const [chats, setChats] = useState([]);
  const [chatsStatus, setChatsStatus] = useState("idle");

  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);

  const isFreelancer = user?.role === "freelancer";
  const contactsEndpoint = isFreelancer
    ? "/users/me/freelancer/chats/contacts"
    : "/users/me/chats/contacts";

  // Auto-select from URL params
  const urlContactId = searchParams.get("contact");
  const urlBookingId = searchParams.get("booking");

  // Load contacts
  const loadContacts = useCallback(async () => {
    setContactsStatus("loading");
    try {
      const payload = await authenticatedFetch.requestJson(contactsEndpoint, {
        method: "GET",
      });
      const rows = extractContacts(payload);
      // Sort by last_message_at descending
      rows.sort((a, b) => {
        const dateA = new Date(a.last_message_at || 0);
        const dateB = new Date(b.last_message_at || 0);
        return dateB - dateA;
      });
      setContacts(rows);
      setContactsStatus("ready");
    } catch (error) {
      console.warn("[ChatPage] Failed to load contacts", error);
      setContacts([]);
      setContactsStatus("error");
    }
  }, [authenticatedFetch, contactsEndpoint]);

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user, loadContacts]);

  // Auto-select contact from URL
  useEffect(() => {
    if (urlContactId && contacts.length > 0 && contactsStatus === "ready") {
      const contactIdNum = parseInt(urlContactId, 10);
      const found = contacts.find((c) => c.user_id === contactIdNum);
      if (found) {
        setSelectedContactId(contactIdNum);
        setMobileSidebarOpen(false);
      }
    }
  }, [urlContactId, contacts, contactsStatus]);

  // Load chats for selected contact
  const loadChats = useCallback(async () => {
    if (!selectedContactId) return;

    setChatsStatus("loading");
    try {
      const chatsEndpoint = isFreelancer
        ? `/users/me/freelancer/chats/contacts/${selectedContactId}`
        : `/users/me/chats/contacts/${selectedContactId}`;

      const payload = await authenticatedFetch.requestJson(chatsEndpoint, {
        method: "GET",
      });
      const rows = extractChats(payload);
      setChats(rows);
      setChatsStatus("ready");
    } catch (error) {
      console.warn("[ChatPage] Failed to load chats", error);
      setChats([]);
      setChatsStatus("error");
    }
  }, [authenticatedFetch, isFreelancer, selectedContactId]);

  useEffect(() => {
    if (selectedContactId) {
      loadChats();
    }
  }, [selectedContactId, loadChats]);

  // Auto-select booking from URL or auto-select if only one
  useEffect(() => {
    if (chatsStatus !== "ready") return;

    const acceptedBookings = getAcceptedBookings();

    if (urlBookingId) {
      const bookingIdNum = parseInt(urlBookingId, 10);
      const found = acceptedBookings.find((b) => b.booking_id === bookingIdNum);
      if (found) {
        setSelectedBookingId(bookingIdNum);
        return;
      }
    }

    // Auto-select if only one accepted booking
    if (acceptedBookings.length === 1) {
      setSelectedBookingId(acceptedBookings[0].booking_id);
    } else if (acceptedBookings.length === 0) {
      setSelectedBookingId(null);
    }
  }, [chats, chatsStatus, urlBookingId]);

  // Scroll to bottom when new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chats]);

  // Get accepted bookings from chats
  const getAcceptedBookings = useCallback(() => {
    const bookingMap = new Map();
    for (const chat of chats) {
      if (!bookingMap.has(chat.booking_id)) {
        bookingMap.set(chat.booking_id, {
          booking_id: chat.booking_id,
          service_title: chat.service_title,
          slot_date: chat.slot_date,
          booking_status: chat.booking_status,
          can_send_message: chat.can_send_message,
        });
      }
    }
    return Array.from(bookingMap.values()).filter((b) => b.can_send_message);
  }, [chats]);

  // Sort chats by created_at (oldest to newest)
  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      return new Date(a.created_at) - new Date(b.created_at);
    });
  }, [chats]);

  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.user_id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  const canSendMessage = useMemo(() => {
    if (!selectedBookingId) return false;
    const acceptedBookings = getAcceptedBookings();
    return acceptedBookings.some((b) => b.booking_id === selectedBookingId);
  }, [selectedBookingId, getAcceptedBookings]);

  const acceptedBookings = useMemo(() => getAcceptedBookings(), [getAcceptedBookings]);

  const handleSelectContact = (contactId) => {
    // If same contact is clicked, just close mobile sidebar
    if (contactId === selectedContactId) {
      setMobileSidebarOpen(false);
      return;
    }

    setSelectedContactId(contactId);
    setChats([]);
    setChatsStatus("idle");
    setSelectedBookingId(null);
    setMobileSidebarOpen(false);
    // Update URL
    const newParams = new URLSearchParams(searchParams);
    newParams.set("contact", contactId.toString());
    newParams.delete("booking");
    setSearchParams(newParams, { replace: true });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedBookingId || !selectedContactId || sendingMessage) {
      return;
    }

    setSendingMessage(true);
    try {
      const payload = await authenticatedFetch.requestJson(
        `/users/me/bookings/${selectedBookingId}/chats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message_text: messageText.trim(),
            receiver_user_id: selectedContactId,
          }),
        }
      );

      if (payload?.chat) {
        setChats((prev) => [...prev, payload.chat]);
      }
      setMessageText("");
    } catch (error) {
      console.warn("[ChatPage] Failed to send message", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="flex h-[calc(100vh-64px)] bg-slate-50">
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className="fixed bottom-4 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-indigo-600 text-white shadow-lg lg:hidden"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {mobileSidebarOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          )}
        </svg>
      </button>

      {/* Contacts Sidebar */}
      <aside
        className={`${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 top-[64px] z-40 w-80 transform border-r border-slate-200 bg-white transition-transform lg:relative lg:top-0 lg:translate-x-0`}
      >
        <header className="border-b border-slate-100 p-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isFreelancer ? "Clients" : "Freelancers"}
          </h2>
          <p className="text-sm text-slate-500">Your conversations</p>
        </header>

        <div className="h-[calc(100%-80px)] overflow-y-auto">
          {contactsStatus === "loading" && (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <ContactSkeleton key={`contact-skeleton-${i}`} />
              ))}
            </div>
          )}

          {contactsStatus === "error" && (
            <div className="p-4 text-center">
              <p className="text-sm text-rose-600">Failed to load contacts</p>
              <button
                type="button"
                onClick={loadContacts}
                className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Try again
              </button>
            </div>
          )}

          {contactsStatus === "ready" && contacts.length === 0 && (
            <div className="p-6 text-center">
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-2xl">
                💬
              </div>
              <p className="text-sm font-medium text-slate-700">No conversations yet</p>
              <p className="mt-1 text-xs text-slate-500">
                {isFreelancer
                  ? "When clients message you, they'll appear here"
                  : "When you book a freelancer and they accept, you can chat here"}
              </p>
            </div>
          )}

          {contactsStatus === "ready" && contacts.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {contacts.map((contact) => {
                const isSelected = contact.user_id === selectedContactId;
                return (
                  <li key={contact.user_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectContact(contact.user_id)}
                      className={`flex w-full items-center gap-3 p-3 text-left transition hover:bg-slate-50 ${
                        isSelected ? "bg-indigo-50 hover:bg-indigo-50" : ""
                      }`}
                    >
                      {contact.avatar_url ? (
                        <img
                          src={contact.avatar_url}
                          alt={`${contact.full_name}'s avatar`}
                          className="h-12 w-12 rounded-full border border-slate-100 object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-sky-400 text-lg font-bold text-white">
                          {getInitial(contact.full_name)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p
                            className={`truncate text-sm font-semibold ${
                              isSelected ? "text-indigo-700" : "text-slate-900"
                            }`}
                          >
                            {contact.full_name || "Unknown"}
                          </p>
                          {contact.unread_count > 0 && (
                            <span className="ml-2 grid h-5 min-w-[20px] place-items-center rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white">
                              {contact.unread_count > 99 ? "99+" : contact.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-500">
                          {contact.last_message || "No messages yet"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatRelativeTime(contact.last_message_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Chat Area */}
      <main className="flex flex-1 flex-col">
        {!selectedContactId ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-4xl">
              💬
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Select a conversation</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Choose a {isFreelancer ? "client" : "freelancer"} from the sidebar to view your
              conversation
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                {selectedContact?.avatar_url ? (
                  <img
                    src={selectedContact.avatar_url}
                    alt={`${selectedContact.full_name}'s avatar`}
                    className="h-10 w-10 rounded-full border border-slate-100 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-sky-400 text-sm font-bold text-white">
                    {getInitial(selectedContact?.full_name)}
                  </span>
                )}
                <div>
                  <p className="font-semibold text-slate-900">
                    {selectedContact?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedContact?.can_send_message
                      ? "Active booking"
                      : "No active booking"}
                  </p>
                </div>
              </div>

              {/* Booking selector */}
              {acceptedBookings.length > 1 && (
                <select
                  value={selectedBookingId || ""}
                  onChange={(e) => setSelectedBookingId(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="" disabled>
                    Select booking...
                  </option>
                  {acceptedBookings.map((booking) => (
                    <option key={booking.booking_id} value={booking.booking_id}>
                      {booking.service_title} - {formatDate(booking.slot_date)}
                    </option>
                  ))}
                </select>
              )}
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
              {chatsStatus === "loading" && <MessageSkeleton />}

              {chatsStatus === "error" && (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-rose-600">Failed to load messages</p>
                  <button
                    type="button"
                    onClick={loadChats}
                    className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Try again
                  </button>
                </div>
              )}

              {chatsStatus === "ready" && chats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-2xl">
                    👋
                  </div>
                  <p className="text-sm font-medium text-slate-700">No messages yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Start the conversation by sending a message below
                  </p>
                </div>
              )}

              {chatsStatus === "ready" && sortedChats.length > 0 && (
                <div className="space-y-3">
                  {sortedChats.map((message, index) => {
                    const prevMessage = index > 0 ? sortedChats[index - 1] : null;
                    const showBookingHeader =
                      !prevMessage || prevMessage.booking_id !== message.booking_id;

                    const isSystemMessage = message.role_of_sender === "system";
                    const isSentByMe =
                      !isSystemMessage &&
                      ((isFreelancer && message.role_of_sender === "freelancer") ||
                        (!isFreelancer && message.role_of_sender === "customer"));

                    return (
                      <div key={message.id}>
                        {/* Booking reference header - shown when booking changes */}
                        {showBookingHeader && (
                          <div className="flex justify-center mb-3 mt-3 first:mt-0">
                            <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs text-slate-600">
                              Re: {message.service_title || "Booking"} on{" "}
                              {formatDate(message.slot_date)}
                            </span>
                          </div>
                        )}

                        {/* System Message */}
                        {isSystemMessage ? (
                          <div className="flex justify-center">
                            <div className="max-w-[85%] rounded-xl bg-slate-100 px-4 py-2 text-center">
                              <p className="text-sm text-slate-600">
                                {message.message_text}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {formatRelativeTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          /* User Message */
                          <div
                            className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                isSentByMe
                                  ? "bg-indigo-600 text-white"
                                  : "bg-white text-slate-900 shadow-sm"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.message_text}
                              </p>
                              <div
                                className={`mt-1 flex items-center gap-1.5 text-xs ${
                                  isSentByMe ? "text-indigo-200" : "text-slate-400"
                                }`}
                              >
                                <span>{formatRelativeTime(message.created_at)}</span>
                                {isSentByMe && message.seen_by_receiver && (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <footer className="border-t border-slate-200 bg-white p-4">
              {!canSendMessage && acceptedBookings.length === 0 ? (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
                  <p className="text-sm text-amber-800">
                    No active booking with this {isFreelancer ? "client" : "freelancer"}.
                    Messaging is only available for accepted bookings.
                  </p>
                </div>
              ) : acceptedBookings.length > 0 && !selectedBookingId ? (
                <div className="rounded-xl bg-slate-100 px-4 py-3 text-center">
                  <p className="text-sm text-slate-600">
                    Select a booking above to send a message
                  </p>
                </div>
              ) : (
                <div className="flex items-end gap-3">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={sendingMessage}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                    style={{ minHeight: "46px", maxHeight: "120px" }}
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendingMessage}
                    className="grid h-[46px] w-[46px] place-items-center rounded-xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {sendingMessage ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </footer>
          </>
        )}
      </main>
    </section>
  );
};

export default ChatPage;
