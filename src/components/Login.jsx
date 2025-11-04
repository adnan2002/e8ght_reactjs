import { useState } from 'react'
import { Link } from 'react-router-dom'
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
    });

  }

  return (
    <AuthPage
      title="Log in"
      footer={<>
        Don't have an account? <Link to="/register">Create one</Link>
      </>}
    >
      <GoogleLoginButton
        redirectTo="/dashboard"
        onStart={() => setError('')}
        onSuccess={() => setError('')}
        onError={(message) => setError(message ?? 'Unable to sign in with Google.')}
      />

      <div className="divider"><span>OR</span></div>

      {error && <div className="form-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <label className="label">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
            required
          />
        </label>

        <label className="label">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input"
            required
            minLength={6}
          />
        </label>

        <button type="submit" className="btn btn-primary">Log in</button>
      </form>
    </AuthPage>
  )
}

export default Login


