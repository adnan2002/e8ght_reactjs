const USER_STORAGE_KEY = "auth:user";

const isBrowser = () => typeof window !== "undefined";

export const readStoredUser = () => {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to read stored user", error);
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const writeStoredUser = (user) => {
  if (!isBrowser()) return;

  try {
    if (user) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Failed to update stored user", error);
  }
};

export const clearStoredUser = () => writeStoredUser(null);

export { USER_STORAGE_KEY };



