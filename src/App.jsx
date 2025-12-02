import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import { useAuth } from './hooks/useAuth.jsx'
import { useLogout } from './hooks/useLogout.jsx'
import Callback from './components/Callback.jsx'
import Dashboard from './components/Dashboard.jsx'
import CustomerDashboard from './pages/dashboard/customer.jsx'
import FreelancerDashboard from './pages/dashboard/freelancer.jsx'
import Onboarding from './components/Onboarding.jsx'
import CreateAddress from './components/CreateAddress.jsx'
import FreelancerForm from './components/FreelancerForm.jsx'
import Settings from './pages/settings/Settings.jsx'
import FreelancerProfileEdit from './pages/settings/FreelancerProfileEdit.jsx'
import FreelancerServicesCreate from './pages/settings/FreelancerServicesCreate.jsx'
import FreelancerServicesView from './pages/settings/FreelancerServicesView.jsx'
import FreelancerSchedulePage from './pages/settings/FreelancerSchedulePage.jsx'
import AddressesList from './pages/addresses/AddressesList.jsx'
import AddressDetails from './pages/addresses/AddressDetails.jsx'
import PublicFreelancers from './pages/freelancers/PublicFreelancers.jsx'
import PublicFreelancerDetail from './pages/freelancers/PublicFreelancerDetail.jsx'
import FreelancerTimeslots from './pages/freelancers/FreelancerTimeslots.jsx'
import ChatPage from './pages/chat/ChatPage.jsx'

function Home() {
  return (
    <div className="home">
      <h1>Welcome</h1>
      <p>Get started by logging in or creating an account.</p>
      <div className="home-actions">
        <Link to="/login" className="btn btn-primary">Log in</Link>
        <Link to="/register" className="btn btn-secondary">Create account</Link>
      </div>
    </div>
  )
}

function App() {
  const { user } = useAuth()
  const logout = useLogout()

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!profileMenuOpen) {
      return
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [profileMenuOpen])

  const handleLogout = (event) => {
    event.preventDefault()
    logout()
    setProfileMenuOpen(false)
  }

  const toggleProfileMenu = () => {
    setProfileMenuOpen((previous) => !previous)
  }

  const closeProfileMenu = () => {
    setProfileMenuOpen(false)
  }

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="app-layout">
      {/* Collapsible Sidebar */}
      {user && (
        <>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-expanded={sidebarOpen}
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
          <aside className={`app-sidebar${sidebarOpen ? ' app-sidebar--open' : ''}`}>
            <nav className="sidebar-nav">
              <Link to="/dashboard" className="sidebar-link" onClick={closeSidebar}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Dashboard</span>
              </Link>
              <Link to="/chat" className="sidebar-link" onClick={closeSidebar}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Chat</span>
              </Link>
              <Link to="/settings" className="sidebar-link" onClick={closeSidebar}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Settings</span>
              </Link>
            </nav>
          </aside>
          {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        </>
      )}
      <nav className="nav">
        <Link to="/" className="brand">E8GHT</Link>
        <div className="nav-actions">
          <Link to="/freelancers" className="btn btn-ghost">
            Freelancers
          </Link>
          {user ? (
            <div className="profile-menu" ref={dropdownRef}>
              <button
                type="button"
                className="profile-toggle"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={toggleProfileMenu}
              >
                <span className="profile-name">{user.full_name ?? user.email ?? 'Account'}</span>
              </button>
              <div className={`profile-dropdown${profileMenuOpen ? ' is-open' : ''}`} role="menu">
                <Link to="/settings" className="dropdown-item" role="menuitem" onClick={closeProfileMenu}>
                  Settings
                </Link>
                <button type="button" className="dropdown-item" role="menuitem" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="ml">Sign up</Link>
            </>
          )}
        </div>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<Callback />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/customer" element={<CustomerDashboard />} />
          <Route path="/dashboard/freelancer" element={<FreelancerDashboard />} />
          <Route path="/freelancers" element={<PublicFreelancers />} />
          <Route path="/freelancers/:id" element={<PublicFreelancerDetail />} />
          <Route
            path="/freelancers/:freelancer_id/:service_id"
            element={
              user
                ? <FreelancerTimeslots />
                : <Navigate to="/login" replace />
            }
          />
          <Route path="/addresses" element={<AddressesList />} />
          <Route path="/freelancer/form" element={<FreelancerForm />} />
          <Route
            path="/onboarding"
            element={
              user
                ? <Onboarding />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/settings"
            element={
              user
                ? <Settings />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/settings/freelancer-profile"
            element={
              user
                ? <FreelancerProfileEdit />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/settings/freelancer-services/create"
            element={
              user
                ? <FreelancerServicesCreate />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/settings/freelancer-services/view"
            element={
              user
                ? <FreelancerServicesView />
                : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/settings/freelancer-schedule"
            element={
              user
                ? <FreelancerSchedulePage />
                : <Navigate to="/login" replace />
            }
          />
          <Route path="/addresses/new" element={<CreateAddress />} />
          <Route path="/addresses/:id" element={<AddressDetails />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      </div>
  )
}

export default App
