import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineArrowRight } from 'react-icons/hi'
import { useAuth } from "../hooks/useAuth.jsx";
import { useApiFetch } from "../hooks/useApiFetch.jsx";
import { useNavigate } from 'react-router-dom';
import AuthPage from './AuthPage.jsx';
import GoogleLoginButton from './Google.jsx';

const DEFAULT_ADDRESS_STORAGE_KEY = 'default:address';

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { setAccessToken, setUser } = useAuth();
  const { postJson } = useApiFetch();
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setIsLoading(true)

    postJson("/sessions", {
      email,
      password,
    }).then((data) => {
      setAccessToken(data.access_token);
      setUser(data.user ?? null);

      if (typeof window !== 'undefined') {
        try {
          const defaultAddress = data?.default_address ?? null;
          const addressId = Number(defaultAddress?.id);

          if (
            defaultAddress &&
            typeof defaultAddress === 'object' &&
            Number.isFinite(addressId) &&
            addressId > 0
          ) {
            window.localStorage.setItem(
              DEFAULT_ADDRESS_STORAGE_KEY,
              JSON.stringify(defaultAddress)
            );
          } else {
            window.localStorage.removeItem(DEFAULT_ADDRESS_STORAGE_KEY);
          }
        } catch (storageError) {
          console.warn('Failed to persist default address', storageError);
        }
      }

      navigate("/dashboard", { replace: true });
    }).catch((error) => {
      setError(error.message);
    }).finally(() => {
      setIsLoading(false)
    });
  }

  return (
    <AuthPage
      title="Welcome back"
      subtitle="Sign in to your E8GHT account to continue"
      footer={<>
        Don't have an account? <Link to="/register" className="auth-link">Create one</Link>
      </>}
    >
      <GoogleLoginButton
        redirectTo="/dashboard"
        onStart={() => setError('')}
        onSuccess={() => setError('')}
        onError={(message) => setError(message ?? 'Unable to sign in with Google.')}
      />

      <div className="auth-divider">
        <span>or continue with email</span>
      </div>

      {error && (
        <div className="auth-error" role="alert">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.15"/>
            <path d="M8 4v4m0 2.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email address</label>
          <div className="auth-input-wrapper">
            <HiOutlineMail className="auth-input-icon" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="auth-input"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="password" className="auth-label">Password</label>
          <div className="auth-input-wrapper">
            <HiOutlineLockClosed className="auth-input-icon" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="auth-input"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary auth-submit"
          disabled={isLoading}
        >
          <span>{isLoading ? 'Signing in...' : 'Sign in'}</span>
          {!isLoading && <HiOutlineArrowRight />}
        </button>
      </form>
    </AuthPage>
  )
}

export default Login
