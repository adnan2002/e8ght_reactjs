import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.jsx'

// Mock conversation data
const MOCK_CONVERSATIONS = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: 'SJ',
    lastMessage: 'Thanks for the great work on my project!',
    timestamp: '2 min ago',
    status: 'active',
    unread: 2,
  },
  {
    id: '2',
    name: 'Michael Chen',
    avatar: 'MC',
    lastMessage: 'Can we schedule a call tomorrow?',
    timestamp: '15 min ago',
    status: 'active',
    unread: 0,
  },
  {
    id: '3',
    name: 'Emily Davis',
    avatar: 'ED',
    lastMessage: 'The design looks perfect!',
    timestamp: '1 hour ago',
    status: 'inactive',
    unread: 0,
  },
  {
    id: '4',
    name: 'James Wilson',
    avatar: 'JW',
    lastMessage: 'Payment has been sent.',
    timestamp: '3 hours ago',
    status: 'inactive',
    unread: 0,
  },
  {
    id: '5',
    name: 'Anna Martinez',
    avatar: 'AM',
    lastMessage: 'Project completed successfully!',
    timestamp: '2 days ago',
    status: 'past',
    unread: 0,
  },
  {
    id: '6',
    name: 'Robert Brown',
    avatar: 'RB',
    lastMessage: 'Great working with you!',
    timestamp: '1 week ago',
    status: 'past',
    unread: 0,
  },
]

// Mock bookings data for "Start Chat"
const MOCK_BOOKINGS = [
  {
    id: 'b1',
    name: 'David Lee',
    avatar: 'DL',
    service: 'Web Development',
    date: 'Dec 5, 2025',
    status: 'upcoming',
  },
  {
    id: 'b2',
    name: 'Sophie Turner',
    avatar: 'ST',
    service: 'UI/UX Design',
    date: 'Dec 8, 2025',
    status: 'upcoming',
  },
  {
    id: 'b3',
    name: 'Chris Evans',
    avatar: 'CE',
    service: 'Mobile App Development',
    date: 'Dec 10, 2025',
    status: 'upcoming',
  },
]

const FILTER_OPTIONS = [
  { id: 'active', label: 'Active chats' },
  { id: 'inactive', label: 'Inactive chats' },
  { id: 'past', label: 'Past chats' },
  { id: 'start', label: 'Start chat' },
]

export default function ChatPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState('active')
  const [selectedChat, setSelectedChat] = useState(null)
  const inputRef = useRef(null)

  // Get booking ID from URL params
  const bookingId = searchParams.get('booking')

  // Handle booking parameter - auto-select or create conversation
  useEffect(() => {
    if (!bookingId || !user) return

    // Check if there's an existing conversation for this booking
    // For now, we'll create a placeholder conversation from the booking
    // In the future, this would fetch from API
    
    // Create a placeholder conversation for the booking
    const bookingConversation = {
      id: `booking-${bookingId}`,
      name: user.role === 'freelancer' ? 'Customer' : 'Freelancer',
      avatar: user.role === 'freelancer' ? 'C' : 'F',
      lastMessage: '',
      timestamp: 'Just now',
      status: 'active',
      unread: 0,
      bookingId: bookingId,
    }

    setSelectedChat(bookingConversation)
    setFilter('active')
  }, [bookingId, user])

  // Focus input when a chat is selected
  useEffect(() => {
    if (selectedChat && inputRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [selectedChat])

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Determine sidebar title based on user role
  const sidebarTitle = user.role === 'freelancer' ? 'Clients' : 'Freelancers'

  // Filter conversations based on selected filter
  const filteredItems = useMemo(() => {
    if (filter === 'start') {
      return MOCK_BOOKINGS
    }
    return MOCK_CONVERSATIONS.filter((conv) => conv.status === filter)
  }, [filter])

  const handleFilterChange = (event) => {
    setFilter(event.target.value)
    setSelectedChat(null)
  }

  const handleSelectChat = (item) => {
    setSelectedChat(item)
  }

  const handleStartChat = (booking) => {
    // In the future, this would create a new conversation
    console.log('Starting chat with:', booking.name)
    setSelectedChat({
      id: `new-${booking.id}`,
      name: booking.name,
      avatar: booking.avatar,
      lastMessage: '',
      timestamp: 'Just now',
      status: 'active',
      unread: 0,
    })
    setFilter('active')
  }

  return (
    <section className="chat-page">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <header className="chat-sidebar__header">
          <h2 className="chat-sidebar__title">{sidebarTitle}</h2>
        </header>

        {/* Filter Radio Buttons */}
        <div className="chat-filters" role="radiogroup" aria-label="Chat filters">
          {FILTER_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={`chat-filter-option${filter === option.id ? ' chat-filter-option--selected' : ''}`}
            >
              <input
                type="radio"
                name="chat-filter"
                value={option.id}
                checked={filter === option.id}
                onChange={handleFilterChange}
                className="chat-filter-option__input"
              />
              <span className="chat-filter-option__label">{option.label}</span>
            </label>
          ))}
        </div>

        {/* Conversation/Booking List */}
        <div className="chat-list">
          {filteredItems.length === 0 ? (
            <p className="chat-list__empty">
              {filter === 'start'
                ? 'No active bookings available.'
                : `No ${filter} conversations.`}
            </p>
          ) : filter === 'start' ? (
            // Show bookings for "Start Chat"
            filteredItems.map((booking) => (
              <button
                key={booking.id}
                type="button"
                className="chat-booking-card"
                onClick={() => handleStartChat(booking)}
              >
                <span className="chat-card__avatar">{booking.avatar}</span>
                <div className="chat-card__content">
                  <span className="chat-card__name">{booking.name}</span>
                  <span className="chat-booking-card__service">{booking.service}</span>
                  <span className="chat-booking-card__date">{booking.date}</span>
                </div>
                <span className="chat-booking-card__action">Start</span>
              </button>
            ))
          ) : (
            // Show conversations
            filteredItems.map((conv) => (
              <button
                key={conv.id}
                type="button"
                className={`chat-card${conv.status === 'active' ? ' chat-card--active' : ''}${selectedChat?.id === conv.id ? ' chat-card--selected' : ''}`}
                onClick={() => handleSelectChat(conv)}
              >
                <span className="chat-card__avatar">{conv.avatar}</span>
                <div className="chat-card__content">
                  <div className="chat-card__header">
                    <span className="chat-card__name">{conv.name}</span>
                    <span className="chat-card__time">{conv.timestamp}</span>
                  </div>
                  <p className="chat-card__message">{conv.lastMessage}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="chat-card__badge">{conv.unread}</span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main">
        {selectedChat ? (
          <>
            <header className="chat-main__header">
              <span className="chat-main__avatar">{selectedChat.avatar}</span>
              <div className="chat-main__info">
                <h3 className="chat-main__name">{selectedChat.name}</h3>
                <span className="chat-main__status">
                  {selectedChat.status === 'active' ? 'Online' : 'Offline'}
                </span>
              </div>
              {selectedChat.bookingId && (
                <span className="chat-main__booking-badge">
                  Booking #{selectedChat.bookingId}
                </span>
              )}
            </header>
            <div className="chat-main__messages">
              <p className="chat-main__placeholder">
                Chat messages will appear here.
              </p>
            </div>
            <footer className="chat-main__footer">
              <input
                ref={inputRef}
                type="text"
                className="chat-main__input"
                placeholder="Type a message..."
              />
              <button type="button" className="chat-main__send">
                Send
              </button>
            </footer>
          </>
        ) : (
          <div className="chat-main__empty">
            <div className="chat-main__empty-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a chat from the sidebar to start messaging.</p>
          </div>
        )}
      </main>
    </section>
  )
}

