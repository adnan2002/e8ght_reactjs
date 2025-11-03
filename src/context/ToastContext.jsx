import { createContext, useCallback, useMemo, useRef, useState } from "react";

const DEFAULT_DURATION = 4500;

const createToastId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const ensureWindow = () => (typeof window === "undefined" ? null : window);

export const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const clearTimer = useCallback((id) => {
    const timers = timersRef.current;
    const timerId = timers.get(id);
    if (timerId != null) {
      ensureWindow()?.clearTimeout(timerId);
      timers.delete(id);
    }
  }, []);

  const removeToast = useCallback((id) => {
    clearTimer(id);
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, [clearTimer]);

  const pushToast = useCallback(
    ({ id = createToastId(), type = "info", title = null, message, description = null, duration = DEFAULT_DURATION, dismissible = true }) => {
      if (!message && !description) {
        return null;
      }

      const normalizedType = ["success", "error", "warning", "info"].includes(type)
        ? type
        : "info";

      const toast = {
        id,
        type: normalizedType,
        title,
        message,
        description,
        dismissible,
      };

      setToasts((previous) => [...previous, toast]);

      const global = ensureWindow();
      if (global && duration && duration > 0) {
        clearTimer(id);
        const timeoutId = global.setTimeout(() => removeToast(id), duration);
        timersRef.current.set(id, timeoutId);
      }

      return id;
    },
    [clearTimer, removeToast]
  );

  const updateToast = useCallback((id, patch) => {
    if (!id || !patch) {
      return;
    }
    setToasts((previous) =>
      previous.map((toast) =>
        toast.id === id
          ? {
              ...toast,
              ...patch,
            }
          : toast
      )
    );
  }, []);

  const notify = useMemo(
    () => ({
      push: pushToast,
      update: updateToast,
      dismiss: removeToast,
      info: (options) => pushToast({ ...options, type: "info" }),
      success: (options) => pushToast({ ...options, type: "success" }),
      warning: (options) => pushToast({ ...options, type: "warning" }),
      error: (options) => pushToast({ ...options, type: "error" }),
    }),
    [pushToast, removeToast, updateToast]
  );

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

const ICON_MAP = {
  success: "✓",
  error: "⚠",
  warning: "!",
  info: "i",
};

const ToastViewport = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-icon" aria-hidden="true">
            {ICON_MAP[toast.type] ?? ICON_MAP.info}
          </div>
          <div className="toast-body">
            {toast.title ? <p className="toast-title">{toast.title}</p> : null}
            {toast.message ? <p className="toast-message">{toast.message}</p> : null}
            {toast.description ? (
              <p className="toast-description">{toast.description}</p>
            ) : null}
          </div>
          {toast.dismissible ? (
            <button
              type="button"
              className="toast-dismiss"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default ToastProvider;

