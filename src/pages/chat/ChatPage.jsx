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

const getLastMessageDisplay = (contact) => {
  // If there's a regular message text, use it
  if (contact.last_message) {
    return contact.last_message;
  }

  // Check if the last message was a price proposal
  if (contact.last_message_kind === "price_proposal" && contact.last_message_price_amount) {
    const firstName = contact.full_name?.split(" ")[0] || "Someone";
    const amount = parseFloat(contact.last_message_price_amount).toFixed(3);
    return `${firstName} proposed ${amount}BD`;
  }

  return "No messages yet";
};

const formatCurrency = (amount, currency) => {
  const num = parseFloat(amount);
  if (Number.isNaN(num)) return `${amount} ${currency}`;
  return new Intl.NumberFormat("en-BH", {
    style: "currency",
    currency: currency || "BHD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(num);
};

const ProposalMessage = ({ message, isSentByMe, isFreelancer, onAccept, isAccepting, onReject, isRejecting, onWithdraw, isWithdrawing }) => {
  const statusConfig = {
    proposed: {
      label: "Pending",
      bg: "#fef3c7",
      text: "#f59e0b",
      border: "#fde68a",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    accepted: {
      label: "Accepted",
      bg: "#d1fae5",
      text: "#10b981",
      border: "#a7f3d0",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ),
    },
    rejected: {
      label: "Rejected",
      bg: "#fee2e2",
      text: "#dc2626",
      border: "#fecaca",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      ),
    },
    expired: {
      label: "Expired",
      bg: "#f3f4f6",
      text: "#6b7280",
      border: "#e5e7eb",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
    withdrawn: {
      label: "Withdrawn",
      bg: "#f3f4f6",
      text: "#6b7280",
      border: "#e5e7eb",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 14l-4-4 4-4" />
          <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
        </svg>
      ),
    },
  };

  const status = statusConfig[message.price_offer_status] || statusConfig.proposed;
  const showActions = message.price_offer_status === "proposed" && !isSentByMe;
  const showWithdraw = message.price_offer_status === "proposed" && isSentByMe;

  return (
    <div className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        {/* Proposal Card */}
        <div
          className="overflow-hidden rounded-2xl border shadow-sm"
          style={{
            borderColor: isSentByMe ? "#f9a8d4" : "rgba(236, 72, 153, 0.15)",
            background: isSentByMe
              ? "linear-gradient(135deg, #fdf2f8 0%, white 100%)"
              : "linear-gradient(135deg, #fdf2f8 0%, white 100%)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: isSentByMe ? "#fce7f3" : "#fdf2f8" }}
          >
            <div
              className="grid h-7 w-7 place-items-center rounded-full"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: "#be185d" }}>
              Price Proposal
            </span>
            <div className="ml-auto">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
                style={{ background: status.bg, color: status.text, borderColor: status.border }}
              >
                {status.icon}
                {status.label}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-4">
            {/* Price Display */}
            <div className="mb-3 text-center">
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#9ca3af", letterSpacing: "0.1em" }}>
                Proposed Amount
              </p>
              <p
                className="mt-1 text-3xl font-bold tracking-tight"
                style={{ color: "#ec4899", letterSpacing: "-0.02em" }}
              >
                {formatCurrency(message.price_offer_amount, message.price_offer_currency)}
              </p>
            </div>

            {/* Message */}
            {message.message_text && (
              <div
                className="rounded-xl px-3 py-2"
                style={{ background: "#fdf2f8" }}
              >
                <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "#4b5563" }}>
                  "{message.message_text}"
                </p>
              </div>
            )}

            {/* Action Buttons - Only show if pending and not sent by me */}
            {showActions && (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => onAccept?.(message.id)}
                  disabled={isAccepting || isRejecting}
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "#10b981" }}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {isAccepting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    {isAccepting ? "Accepting..." : "Accept"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onReject?.(message.id)}
                  disabled={isAccepting || isRejecting}
                  className="flex-1 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ borderColor: "#ec4899", color: "#ec4899" }}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {isRejecting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#ec4899" }} />
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    )}
                    {isRejecting ? "Rejecting..." : "Reject"}
                  </span>
                </button>
              </div>
            )}

            {/* Withdraw Button - Only show if pending and sent by me */}
            {showWithdraw && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => onWithdraw?.(message.id)}
                  disabled={isWithdrawing}
                  className="w-full rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ borderColor: "rgba(236, 72, 153, 0.2)", color: "#4b5563" }}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {isWithdrawing ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "#4b5563" }} />
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M9 14l-4-4 4-4" />
                        <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
                      </svg>
                    )}
                    {isWithdrawing ? "Withdrawing..." : "Withdraw Offer"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between border-t px-4 py-2"
            style={{ borderColor: "#fce7f3", background: "#fdf2f8" }}
          >
            <span className="text-xs" style={{ color: "#9ca3af" }}>
              {formatRelativeTime(message.created_at)}
            </span>
            {isSentByMe && message.seen_by_receiver && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#ec4899" }}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Seen
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
    <div className="h-12 w-12 rounded-full" style={{ background: "#fbcfe8" }} />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-24 rounded" style={{ background: "#fbcfe8" }} />
      <div className="h-3 w-32 rounded" style={{ background: "#fce7f3" }} />
    </div>
  </div>
);

const MessageSkeleton = () => (
  <div className="animate-pulse space-y-4 p-4">
    <div className="flex justify-start">
      <div className="h-16 w-48 rounded-2xl" style={{ background: "#fce7f3" }} />
    </div>
    <div className="flex justify-end">
      <div className="h-12 w-40 rounded-2xl" style={{ background: "#fbcfe8" }} />
    </div>
    <div className="flex justify-start">
      <div className="h-20 w-56 rounded-2xl" style={{ background: "#fce7f3" }} />
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
  const [acceptingChatId, setAcceptingChatId] = useState(null);
  const [rejectingChatId, setRejectingChatId] = useState(null);
  const [withdrawingChatId, setWithdrawingChatId] = useState(null);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  // Price offer modal state
  const [priceOfferModalOpen, setPriceOfferModalOpen] = useState(false);
  const [priceOfferAmount, setPriceOfferAmount] = useState("");
  const [priceOfferMessage, setPriceOfferMessage] = useState("");
  const [creatingPriceOffer, setCreatingPriceOffer] = useState(false);
  const [priceOfferError, setPriceOfferError] = useState("");

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

  const handleAcceptPriceOffer = async (chatId) => {
    if (acceptingChatId || rejectingChatId || withdrawingChatId) return;

    setAcceptingChatId(chatId);
    try {
      const payload = await authenticatedFetch.requestJson(
        `/price-offers/${chatId}/accept`,
        {
          method: "POST",
        }
      );

      if (payload?.chat) {
        // Update the chat in local state with the new status
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, price_offer_status: payload.chat.status || "accepted" }
              : chat
          )
        );
      }
    } catch (error) {
      console.warn("[ChatPage] Failed to accept price offer", error);
    } finally {
      setAcceptingChatId(null);
    }
  };

  const handleRejectPriceOffer = async (chatId) => {
    if (acceptingChatId || rejectingChatId || withdrawingChatId) return;

    setRejectingChatId(chatId);
    try {
      const payload = await authenticatedFetch.requestJson(
        `/price-offers/${chatId}/reject`,
        {
          method: "POST",
        }
      );

      if (payload?.chat) {
        // Update the chat in local state with the new status
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, price_offer_status: payload.chat.status || "rejected" }
              : chat
          )
        );
      }
    } catch (error) {
      console.warn("[ChatPage] Failed to reject price offer", error);
    } finally {
      setRejectingChatId(null);
    }
  };

  const handleWithdrawPriceOffer = async (chatId) => {
    if (acceptingChatId || rejectingChatId || withdrawingChatId) return;

    setWithdrawingChatId(chatId);
    try {
      const payload = await authenticatedFetch.requestJson(
        `/price-offers/${chatId}/withdraw`,
        {
          method: "POST",
        }
      );

      if (payload?.chat) {
        // Update the chat in local state with the new status
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, price_offer_status: payload.chat.status || "withdrawn" }
              : chat
          )
        );
      }
    } catch (error) {
      console.warn("[ChatPage] Failed to withdraw price offer", error);
    } finally {
      setWithdrawingChatId(null);
    }
  };

  const openPriceOfferModal = () => {
    setPriceOfferAmount("");
    setPriceOfferMessage("");
    setPriceOfferError("");
    setPriceOfferModalOpen(true);
  };

  const closePriceOfferModal = () => {
    setPriceOfferModalOpen(false);
    setPriceOfferAmount("");
    setPriceOfferMessage("");
    setPriceOfferError("");
  };

  const handleCreatePriceOffer = async (e) => {
    e.preventDefault();

    const amount = parseFloat(priceOfferAmount);
    if (!amount || amount <= 0) {
      setPriceOfferError("Please enter a valid amount greater than 0");
      return;
    }

    if (!selectedBookingId || !selectedContactId) {
      setPriceOfferError("Please select a booking first");
      return;
    }

    setCreatingPriceOffer(true);
    setPriceOfferError("");

    try {
      const payload = await authenticatedFetch.requestJson("/price-offers/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: selectedBookingId,
          receiver_user_id: selectedContactId,
          amount: amount,
          message_text: priceOfferMessage.trim() || undefined,
        }),
      });

      if (payload?.chat) {
        // Normalize the response to match expected field names
        const chat = payload.chat;
        const normalizedChat = {
          id: chat.chat_id ?? chat.id,
          booking_id: chat.chat_booking_id ?? chat.booking_id,
          sender_user_id: chat.sender_user_id,
          receiver_user_id: chat.receiver_user_id,
          kind: chat.kind,
          message_text: chat.message_text,
          role_of_sender: chat.role_of_sender,
          seen_by_receiver: chat.seen_by_receiver,
          metadata: chat.metadata,
          created_at: chat.chat_created_at ?? chat.created_at,
          price_offer_id: chat.price_offer_id ?? chat.chat_price_offer_id,
          price_offer_amount: chat.amount ?? chat.price_offer_amount,
          price_offer_currency: chat.currency ?? chat.price_offer_currency,
          price_offer_status: chat.status ?? chat.price_offer_status,
          // Keep booking info from current selection for display
          service_title: acceptedBookings.find((b) => b.booking_id === selectedBookingId)?.service_title,
          slot_date: acceptedBookings.find((b) => b.booking_id === selectedBookingId)?.slot_date,
        };
        setChats((prev) => [...prev, normalizedChat]);
        closePriceOfferModal();
      }
    } catch (error) {
      console.warn("[ChatPage] Failed to create price offer", error);
      setPriceOfferError(error.message || "Failed to create price offer. Please try again.");
    } finally {
      setCreatingPriceOffer(false);
    }
  };

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="chat-page" style={{ background: "#fdf2f8" }}>
      {/* Mobile sidebar toggle */}
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className="fixed bottom-4 right-4 z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-lg lg:hidden"
        style={{
          background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
          boxShadow: "0 4px 14px rgba(236, 72, 153, 0.35)",
        }}
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
        } fixed inset-y-0 left-0 top-[64px] z-40 w-80 shrink-0 transform border-r bg-white transition-transform lg:relative lg:top-0 lg:translate-x-0`}
        style={{ borderColor: "rgba(236, 72, 153, 0.1)" }}
      >
        <header className="border-b p-4" style={{ borderColor: "rgba(236, 72, 153, 0.1)" }}>
          <h2 className="text-lg font-bold" style={{ color: "#1f2937" }}>
            {isFreelancer ? "Clients" : "Freelancers"}
          </h2>
          <p className="text-sm" style={{ color: "#6b7280" }}>Your conversations</p>
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
              <p className="text-sm" style={{ color: "#dc2626" }}>Failed to load contacts</p>
              <button
                type="button"
                onClick={loadContacts}
                className="mt-2 text-sm font-medium"
                style={{ color: "#ec4899" }}
              >
                Try again
              </button>
            </div>
          )}

          {contactsStatus === "ready" && contacts.length === 0 && (
            <div className="p-6 text-center">
              <div
                className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full text-2xl"
                style={{ background: "#fce7f3" }}
              >
                💬
              </div>
              <p className="text-sm font-medium" style={{ color: "#1f2937" }}>No conversations yet</p>
              <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>
                {isFreelancer
                  ? "When clients message you, they'll appear here"
                  : "When you book a freelancer and they accept, you can chat here"}
              </p>
            </div>
          )}

          {contactsStatus === "ready" && contacts.length > 0 && (
            <ul className="divide-y" style={{ divideColor: "rgba(236, 72, 153, 0.1)" }}>
              {contacts.map((contact) => {
                const isSelected = contact.user_id === selectedContactId;
                return (
                  <li key={contact.user_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectContact(contact.user_id)}
                      className="flex w-full items-center gap-3 p-3 text-left transition"
                      style={{
                        background: isSelected ? "#fdf2f8" : "white",
                      }}
                    >
                      {contact.avatar_url ? (
                        <img
                          src={contact.avatar_url}
                          alt={`${contact.full_name}'s avatar`}
                          className="h-12 w-12 rounded-full border object-cover"
                          style={{ borderColor: "rgba(236, 72, 153, 0.2)" }}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <span
                          className="grid h-12 w-12 place-items-center rounded-full text-lg font-bold text-white"
                          style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" }}
                        >
                          {getInitial(contact.full_name)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p
                            className="truncate text-sm font-semibold"
                            style={{ color: isSelected ? "#ec4899" : "#1f2937" }}
                          >
                            {contact.full_name || "Unknown"}
                          </p>
                          {contact.unread_count > 0 && (
                            <span
                              className="ml-2 grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-xs font-bold text-white"
                              style={{ background: "#ec4899" }}
                            >
                              {contact.unread_count > 99 ? "99+" : contact.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs" style={{ color: "#6b7280" }}>
                          {getLastMessageDisplay(contact)}
                        </p>
                        <p className="text-xs" style={{ color: "#9ca3af" }}>
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
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: "rgba(0, 0, 0, 0.2)" }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Chat Area */}
      <main className="flex min-w-0 flex-1 flex-col">
        {!selectedContactId ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div
              className="mb-4 grid h-20 w-20 place-items-center rounded-full text-4xl"
              style={{ background: "#fce7f3" }}
            >
              💬
            </div>
            <h3 className="text-xl font-bold" style={{ color: "#1f2937" }}>Select a conversation</h3>
            <p className="mt-2 max-w-sm text-sm" style={{ color: "#6b7280" }}>
              Choose a {isFreelancer ? "client" : "freelancer"} from the sidebar to view your
              conversation
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header
              className="flex items-center justify-between border-b bg-white px-4 py-3"
              style={{ borderColor: "rgba(236, 72, 153, 0.1)" }}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="rounded-lg p-2 lg:hidden"
                  style={{ color: "#6b7280" }}
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
                    className="h-10 w-10 rounded-full border object-cover"
                    style={{ borderColor: "rgba(236, 72, 153, 0.2)" }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" }}
                  >
                    {getInitial(selectedContact?.full_name)}
                  </span>
                )}
                <div>
                  <p className="font-semibold" style={{ color: "#1f2937" }}>
                    {selectedContact?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs" style={{ color: "#6b7280" }}>
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
                  className="rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none"
                  style={{
                    borderColor: "rgba(236, 72, 153, 0.2)",
                    color: "#4b5563",
                  }}
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
            <div className="flex-1 overflow-y-auto p-4" style={{ background: "#fdf2f8" }}>
              {chatsStatus === "loading" && <MessageSkeleton />}

              {chatsStatus === "error" && (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm" style={{ color: "#dc2626" }}>Failed to load messages</p>
                  <button
                    type="button"
                    onClick={loadChats}
                    className="mt-2 text-sm font-medium"
                    style={{ color: "#ec4899" }}
                  >
                    Try again
                  </button>
                </div>
              )}

              {chatsStatus === "ready" && chats.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="mb-3 grid h-14 w-14 place-items-center rounded-full text-2xl"
                    style={{ background: "#fce7f3" }}
                  >
                    👋
                  </div>
                  <p className="text-sm font-medium" style={{ color: "#1f2937" }}>No messages yet</p>
                  <p className="mt-1 text-xs" style={{ color: "#6b7280" }}>
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
                    const isPriceProposal = message.kind === "price_proposal";
                    const isSentByMe =
                      !isSystemMessage &&
                      ((isFreelancer && message.role_of_sender === "freelancer") ||
                        (!isFreelancer && message.role_of_sender === "customer"));

                    return (
                      <div key={message.id}>
                        {/* Booking reference header - shown when booking changes */}
                        {showBookingHeader && (
                          <div className="flex justify-center mb-3 mt-3 first:mt-0">
                            <span
                              className="rounded-full px-3 py-1 text-xs"
                              style={{ background: "#fce7f3", color: "#be185d" }}
                            >
                              Re: {message.service_title || "Booking"} on{" "}
                              {formatDate(message.slot_date)}
                            </span>
                          </div>
                        )}

                        {/* System Message */}
                        {isSystemMessage ? (
                          <div className="flex justify-center">
                            <div
                              className="max-w-[85%] rounded-xl px-4 py-2 text-center"
                              style={{ background: "#fce7f3" }}
                            >
                              <p className="text-sm" style={{ color: "#4b5563" }}>
                                {message.message_text}
                              </p>
                              <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>
                                {formatRelativeTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        ) : isPriceProposal ? (
                          /* Price Proposal Message */
                          <ProposalMessage
                            message={message}
                            isSentByMe={isSentByMe}
                            isFreelancer={isFreelancer}
                            onAccept={handleAcceptPriceOffer}
                            isAccepting={acceptingChatId === message.id}
                            onReject={handleRejectPriceOffer}
                            isRejecting={rejectingChatId === message.id}
                            onWithdraw={handleWithdrawPriceOffer}
                            isWithdrawing={withdrawingChatId === message.id}
                          />
                        ) : (
                          /* User Message */
                          <div
                            className={`flex ${isSentByMe ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className="max-w-[75%] rounded-2xl px-4 py-2.5"
                              style={{
                                background: isSentByMe
                                  ? "linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                                  : "white",
                                color: isSentByMe ? "white" : "#1f2937",
                                boxShadow: isSentByMe
                                  ? "0 4px 14px rgba(236, 72, 153, 0.25)"
                                  : "0 2px 8px rgba(0, 0, 0, 0.06)",
                              }}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.message_text}
                              </p>
                              <div
                                className="mt-1 flex items-center gap-1.5 text-xs"
                                style={{ color: isSentByMe ? "rgba(255,255,255,0.7)" : "#9ca3af" }}
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
            <footer className="border-t bg-white p-4" style={{ borderColor: "rgba(236, 72, 153, 0.1)" }}>
              {!canSendMessage && acceptedBookings.length === 0 ? (
                <div
                  className="rounded-xl px-4 py-3 text-center"
                  style={{ background: "#fef3c7" }}
                >
                  <p className="text-sm" style={{ color: "#92400e" }}>
                    No active booking with this {isFreelancer ? "client" : "freelancer"}.
                    Messaging is only available for accepted bookings.
                  </p>
                </div>
              ) : acceptedBookings.length > 0 && !selectedBookingId ? (
                <div
                  className="rounded-xl px-4 py-3 text-center"
                  style={{ background: "#fce7f3" }}
                >
                  <p className="text-sm" style={{ color: "#be185d" }}>
                    Select a booking above to send a message
                  </p>
                </div>
              ) : (
                <div className="flex items-end gap-3">
                  {/* Price Offer Button */}
                  <button
                    type="button"
                    onClick={openPriceOfferModal}
                    title="Send price offer"
                    className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl border shadow-sm transition"
                    style={{
                      borderColor: "#10b981",
                      background: "#d1fae5",
                      color: "#10b981",
                    }}
                  >
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
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </button>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={sendingMessage}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm transition focus:outline-none"
                    style={{
                      borderColor: "rgba(236, 72, 153, 0.2)",
                      color: "#1f2937",
                      background: sendingMessage ? "#fdf2f8" : "white",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendingMessage}
                    className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl text-white shadow-sm transition disabled:cursor-not-allowed"
                    style={{
                      background: !messageText.trim() || sendingMessage
                        ? "#e5e7eb"
                        : "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                      color: !messageText.trim() || sendingMessage ? "#9ca3af" : "white",
                      boxShadow: !messageText.trim() || sendingMessage
                        ? "none"
                        : "0 4px 14px rgba(236, 72, 153, 0.35)",
                    }}
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

      {/* Price Offer Modal */}
      {priceOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
            onClick={closePriceOfferModal}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white transition-all"
            style={{ boxShadow: "0 16px 40px rgba(236, 72, 153, 0.15)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b px-6 py-4"
              style={{ borderColor: "#fce7f3", background: "linear-gradient(to right, #fdf2f8, #fce7f3)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-items-center rounded-full"
                  style={{ background: "#10b981" }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "#1f2937" }}>Create Price Offer</h3>
                  <p className="text-sm" style={{ color: "#6b7280" }}>Send a proposal to {selectedContact?.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePriceOfferModal}
                className="rounded-lg p-2 transition"
                style={{ color: "#9ca3af" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreatePriceOffer} className="p-6">
              {/* Amount Field */}
              <div className="mb-5">
                <label htmlFor="priceOfferAmount" className="mb-2 block text-sm font-medium" style={{ color: "#4b5563" }}>
                  Amount <span style={{ color: "#ec4899" }}>*</span>
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 font-medium"
                    style={{ color: "#9ca3af" }}
                  >
                    BHD
                  </span>
                  <input
                    id="priceOfferAmount"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={priceOfferAmount}
                    onChange={(e) => setPriceOfferAmount(e.target.value)}
                    placeholder="0.000"
                    required
                    className="w-full rounded-xl border py-3 pl-14 pr-4 text-lg font-semibold transition focus:outline-none"
                    style={{
                      borderColor: "rgba(236, 72, 153, 0.2)",
                      color: "#1f2937",
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs" style={{ color: "#6b7280" }}>Enter the amount you want to propose</p>
              </div>

              {/* Message Field */}
              <div className="mb-5">
                <label htmlFor="priceOfferMessage" className="mb-2 block text-sm font-medium" style={{ color: "#4b5563" }}>
                  Message <span style={{ color: "#9ca3af" }}>(optional)</span>
                </label>
                <textarea
                  id="priceOfferMessage"
                  value={priceOfferMessage}
                  onChange={(e) => setPriceOfferMessage(e.target.value)}
                  placeholder="Add a note to explain your offer..."
                  rows={3}
                  className="w-full resize-none rounded-xl border px-4 py-3 text-sm transition focus:outline-none"
                  style={{
                    borderColor: "rgba(236, 72, 153, 0.2)",
                    color: "#1f2937",
                  }}
                />
              </div>

              {/* Error Message */}
              {priceOfferError && (
                <div
                  className="mb-5 rounded-xl border px-4 py-3"
                  style={{ background: "#fee2e2", borderColor: "#fecaca" }}
                >
                  <p className="text-sm" style={{ color: "#dc2626" }}>{priceOfferError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closePriceOfferModal}
                  disabled={creatingPriceOffer}
                  className="flex-1 rounded-xl border bg-white px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ borderColor: "rgba(236, 72, 153, 0.2)", color: "#4b5563" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPriceOffer || !priceOfferAmount}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                    boxShadow: "0 4px 14px rgba(236, 72, 153, 0.35)",
                  }}
                >
                  {creatingPriceOffer ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending...
                    </span>
                  ) : (
                    "Send Offer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default ChatPage;
