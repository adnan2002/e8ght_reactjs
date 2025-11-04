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

  const handleLogout = (event) => {
    event.preventDefault()
    logout()
  }

  return (
    <div>
      <nav className="nav">
        <Link to="/" className="brand">E8GHT</Link>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user">{user.full_name ?? user.email ?? 'Account'}</span>
              <button type="button" className="btn btn-secondary ml" onClick={handleLogout}>
                Log out
              </button>
            </>
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
          <Route
            path="/onboarding"
            element={
              user
                ? <Onboarding />
                : <Navigate to="/login" replace />
            }
          />
          <Route path="/addresses/new" element={<CreateAddress />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
