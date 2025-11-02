import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from "../hooks/useAuth.jsx";
import { useApiFetch } from "../hooks/useApiFetch.jsx";
import { useNavigate } from 'react-router-dom';
import AuthPage from './AuthPage.jsx';
import GoogleLoginButton from './Google.jsx';
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


