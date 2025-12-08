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
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero__bg" />
        <div className="landing-hero__content">
          <div className="landing-hero__logo">
            <img src="/logo.jpg" alt="E8GHT" className="landing-logo-img" />
          </div>
          <h1 className="landing-hero__title">
            Find the Perfect <span className="text-gradient">Freelancer</span> for Your Needs
          </h1>
          <p className="landing-hero__subtitle">
            Connect with skilled professionals ready to bring your projects to life. 
            Whether you need a designer, developer, or consultant — we've got you covered.
          </p>
          <div className="landing-hero__cta">
            <Link to="/freelancers" className="btn btn-landing-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Browse Freelancers
            </Link>
            <Link to="/register" className="btn btn-landing-secondary">
              Get Started Free
            </Link>
          </div>
        </div>
        <div className="landing-hero__stats">
          <div className="landing-stat">
            <span className="landing-stat__value">500+</span>
            <span className="landing-stat__label">Freelancers</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat__value">2k+</span>
            <span className="landing-stat__label">Projects Done</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat__value">98%</span>
            <span className="landing-stat__label">Satisfaction</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <div className="landing-features__header">
          <h2 className="landing-features__title">Why Choose E8GHT?</h2>
          <p className="landing-features__subtitle">Everything you need to find and work with amazing talent</p>
        </div>
        <div className="landing-features__grid">
          <div className="feature-card">
            <div className="feature-card__icon feature-card__icon--pink">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="feature-card__title">Verified Professionals</h3>
            <p className="feature-card__desc">Every freelancer is vetted and verified to ensure quality service delivery.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card__icon feature-card__icon--purple">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="feature-card__title">Easy Scheduling</h3>
            <p className="feature-card__desc">Book appointments directly with freelancers based on their real-time availability.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card__icon feature-card__icon--blue">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="feature-card__title">Direct Communication</h3>
            <p className="feature-card__desc">Chat directly with freelancers to discuss your project requirements.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card__icon feature-card__icon--green">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h3 className="feature-card__title">Secure & Trusted</h3>
            <p className="feature-card__desc">Your data and transactions are protected with enterprise-grade security.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-how">
        <div className="landing-how__header">
          <h2 className="landing-how__title">How It Works</h2>
          <p className="landing-how__subtitle">Get started in just 3 simple steps</p>
        </div>
        <div className="landing-how__steps">
          <div className="how-step">
            <div className="how-step__number">1</div>
            <h3 className="how-step__title">Browse & Discover</h3>
            <p className="how-step__desc">Explore our curated list of talented freelancers across various categories.</p>
          </div>
          <div className="how-step__connector" />
          <div className="how-step">
            <div className="how-step__number">2</div>
            <h3 className="how-step__title">Book a Slot</h3>
            <p className="how-step__desc">Choose a convenient time slot from the freelancer's availability calendar.</p>
          </div>
          <div className="how-step__connector" />
          <div className="how-step">
            <div className="how-step__number">3</div>
            <h3 className="how-step__title">Get It Done</h3>
            <p className="how-step__desc">Collaborate with your freelancer and get your project completed.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <div className="landing-cta__content">
          <h2 className="landing-cta__title">Ready to Get Started?</h2>
          <p className="landing-cta__subtitle">Join thousands of happy customers finding the perfect freelancer for their needs.</p>
          <Link to="/register" className="btn btn-landing-cta">
            Create Free Account
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </section>
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
            <div className="sidebar-header">
              <img src="/logo.jpg" alt="E8GHT" className="sidebar-logo-img" />
            </div>
            <nav className="sidebar-nav">
              <div className="sidebar-section">
                <span className="sidebar-section-label">Menu</span>
                <Link to="/dashboard" className="sidebar-link" onClick={closeSidebar}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  <span>Dashboard</span>
                </Link>
                {user.role !== 'freelancer' && (
                  <Link to="/freelancers" className="sidebar-link" onClick={closeSidebar}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Find Freelancers</span>
                  </Link>
                )}
                <Link to="/chat" className="sidebar-link" onClick={closeSidebar}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Messages</span>
                </Link>
              </div>
              <div className="sidebar-section">
                <span className="sidebar-section-label">Account</span>
                <Link to="/settings" className="sidebar-link" onClick={closeSidebar}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>Settings</span>
                </Link>
              </div>
            </nav>
            <div className="sidebar-footer">
              <div className="sidebar-user">
                <span className="sidebar-user-avatar">
                  {(user.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                </span>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{user.full_name ?? 'User'}</span>
                  <span className="sidebar-user-role">{user.role === 'freelancer' ? 'Freelancer' : 'Customer'}</span>
                </div>
              </div>
            </div>
          </aside>
          {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        </>
      )}
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="brand">
            <img src="/logo.jpg" alt="E8GHT" className="brand-logo" />
          </Link>
        </div>
        <div className="header-right">
          {user ? (
            <div className="profile-menu" ref={dropdownRef}>
              <button
                type="button"
                className="profile-toggle"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={toggleProfileMenu}
              >
                <span className="profile-avatar">
                  {(user.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                </span>
                <span className="profile-name">{user.full_name ?? user.email ?? 'Account'}</span>
                <svg className="profile-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className={`profile-dropdown${profileMenuOpen ? ' is-open' : ''}`} role="menu">
                <div className="dropdown-header">
                  <span className="dropdown-avatar">
                    {(user.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
                  </span>
                  <div className="dropdown-user-info">
                    <span className="dropdown-user-name">{user.full_name ?? 'User'}</span>
                    <span className="dropdown-user-email">{user.email ?? ''}</span>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <Link to="/dashboard" className="dropdown-item" role="menuitem" onClick={closeProfileMenu}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  Dashboard
                </Link>
                <Link to="/settings" className="dropdown-item" role="menuitem" onClick={closeProfileMenu}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Settings
                </Link>
                <div className="dropdown-divider" />
                <button type="button" className="dropdown-item dropdown-item--danger" role="menuitem" onClick={handleLogout}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Log out
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-ghost-header">Log in</Link>
              <Link to="/register" className="btn btn-primary-header">Sign up</Link>
            </div>
          )}
        </div>
      </header>
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
          <Route
            path="/chat"
            element={
              user
                ? <ChatPage />
                : <Navigate to="/login" replace />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      </div>
  )
}

export default App
