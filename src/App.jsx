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
import AddressesList from './pages/addresses/AddressesList.jsx'
import AddressDetails from './pages/addresses/AddressDetails.jsx'

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

  return (
    <div>
      <nav className="nav">
        <Link to="/" className="brand">E8GHT</Link>
        <div className="nav-actions">
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
          <Route path="/addresses/new" element={<CreateAddress />} />
          <Route path="/addresses/:id" element={<AddressDetails />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
