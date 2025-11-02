import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiFetch } from '../hooks/useApiFetch.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { tryParseJson } from '../utils/http';

const findRedirectUrl = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

  return (
    payload.url ??
    payload.redirect_url ??
    payload.redirectUrl ??
    payload.authorization_url ??
    payload.authorizationUrl ??
    payload.authUrl ??
    null
  );
};

const pickAccessToken = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

  return (
    payload.access_token ??
    payload.accessToken ??
    payload.token ??
    null
  );
};

const deriveErrorMessage = (status, payload) => {
  if (payload != null) {
    if (typeof payload === 'string') {
      return payload;
    }

    const messageCandidates = [
      payload.detail,
      payload.message,
      payload.error_description,
      payload.error,
    ].filter((value) => typeof value === 'string' && value.trim().length > 0);

    if (messageCandidates.length > 0) {
      return messageCandidates[0];
    }

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      const firstError = payload.errors[0];
      if (typeof firstError === 'string') {
        return firstError;
      }
      if (typeof firstError?.message === 'string') {
        return firstError.message;
      }
    }
  }

  const fallbackByStatus = {
    400: 'We could not start Google sign-in. Please double-check and try again.',
    401: 'Your session expired. Please log in again.',
    403: 'Google sign-in is not available for this account.',
    404: 'Google sign-in endpoint was not found.',
    429: 'Too many attempts. Please wait a moment and try again.',
    500: 'Something went wrong on our side. Please try again in a moment.',
    502: 'The server is temporarily unavailable. Please retry shortly.',
    503: 'The service is currently unavailable. Please try again later.',
    504: 'The request timed out. Please try again.',
  };

  if (status && fallbackByStatus[status]) {
    return fallbackByStatus[status];
  }

  return 'Could not start Google sign-in. Please try again.';
};

const pickUser = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  return payload.user ?? payload.profile ?? null;
};

const pickSuccessMessage = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  return payload.message ?? payload.detail ?? null;
};

export default function GoogleLoginButton({
  redirectTo = '/dashboard',
  onStart,
  onSuccess,
  onError,
  onLoadingChange,
  className = '',
  buttonLabel = 'Continue with Google',
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: null });

  const navigate = useNavigate();
  const { request } = useApiFetch();
  const { setAccessToken, setUser } = useAuth();

  const showInlineStatus = useMemo(() => onError == null, [onError]);

  const updateStatus = useCallback((type, message) => {
    if (!showInlineStatus) return;
    setStatus({ type, message });
  }, [showInlineStatus]);

  const clearStatus = useCallback(() => {
    if (!showInlineStatus) return;
    setStatus({ type: 'idle', message: null });
  }, [showInlineStatus]);

  const handleGoogleLogin = useCallback(async () => {
    onStart?.();
    onLoadingChange?.(true);
    setLoading(true);
    clearStatus();

    try {
      const response = await request('/oauth/google', {
        method: 'GET',
        credentials: 'include',
      });

      const payload = await tryParseJson(response);

      if (!response.ok) {
        const message = deriveErrorMessage(response.status, payload);
        const error = new Error(message);
        error.response = response;
        error.status = response.status;
        error.payload = payload;
        throw error;
      }

      const redirectUrl = findRedirectUrl(payload);
      if (redirectUrl) {
        updateStatus('success', 'Redirecting to Google…');
        onSuccess?.(payload ?? null);
        if (typeof window !== 'undefined') {
          window.location.assign(redirectUrl);
        }
        return;
      }

      const nextAccessToken = pickAccessToken(payload);
      if (typeof nextAccessToken === 'string' && nextAccessToken.length > 0) {
        setAccessToken(nextAccessToken);
      }

      const nextUser = pickUser(payload);
      if (nextUser !== undefined) {
        setUser(nextUser);
      }

      onSuccess?.(payload ?? null);

      if (redirectTo) {
        navigate(redirectTo, { replace: true });
        return;
      }

      const successMessage = pickSuccessMessage(payload) ?? 'Google sign-in completed.';
      updateStatus('success', successMessage);
    } catch (error) {
      let message = error?.message;

      if (!message || message === 'Failed to fetch') {
        if (error?.payload) {
          message = deriveErrorMessage(error.status ?? error.response?.status, error.payload);
        } else if (error?.name === 'TypeError') {
          message = 'Unable to reach the server. Check your internet connection and try again.';
        } else {
          message = 'Could not start Google sign-in. Please try again.';
        }
      }

      updateStatus('error', message);
      onError?.(message, error);
      console.error('Google sign-in failed', error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [
    clearStatus,
    navigate,
    onError,
    onLoadingChange,
    onStart,
    onSuccess,
    redirectTo,
    request,
    setAccessToken,
    setUser,
    updateStatus,
  ]);

  const buttonClassName = useMemo(() => {
    const base = 'btn btn-google w-full flex items-center justify-center gap-2';
    return className ? `${base} ${className}` : base;
  }, [className]);

  const statusMessage = status.message;
  const statusType = status.type;
  const shouldShowStatus = showInlineStatus && statusType !== 'idle' && statusMessage;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className={buttonClassName}
        aria-busy={loading}
      >
        {loading ? 'Connecting to Google…' : buttonLabel}
      </button>

      {shouldShowStatus && (
        <p
          className={statusType === 'error' ? 'text-sm text-red-600' : 'text-sm text-green-600'}
          role={statusType === 'error' ? 'alert' : 'status'}
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
}