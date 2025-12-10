const USER_STORAGE_KEY = "auth:user";
const ADDRESS_STORAGE_KEY = "default:address";

const isBrowser = () => typeof window !== "undefined";

const getItem = (key) => {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return null;
  }
};

const setItem = (key, value) => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to write ${key}`, error);
  }
};

const removeItem = (key) => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove ${key}`, error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// User Storage
// ─────────────────────────────────────────────────────────────────────────────

export const readStoredUser = () => {
  const raw = getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse stored user", error);
    removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const writeStoredUser = (user) => {
  if (user) {
    setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    removeItem(USER_STORAGE_KEY);
  }
};

export const clearStoredUser = () => writeStoredUser(null);

// ─────────────────────────────────────────────────────────────────────────────
// Address Storage
// ─────────────────────────────────────────────────────────────────────────────

export const readStoredAddress = () => {
  const raw = getItem(ADDRESS_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn("Failed to parse stored address", error);
    removeItem(ADDRESS_STORAGE_KEY);
    return null;
  }
};

export const writeStoredAddress = (address) => {
  if (address && typeof address === "object") {
    const addressId = Number(address.id);
    if (Number.isFinite(addressId) && addressId > 0) {
      setItem(ADDRESS_STORAGE_KEY, JSON.stringify(address));
    } else {
      removeItem(ADDRESS_STORAGE_KEY);
    }
  } else {
    removeItem(ADDRESS_STORAGE_KEY);
  }
};

export const clearStoredAddress = () => removeItem(ADDRESS_STORAGE_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { USER_STORAGE_KEY, ADDRESS_STORAGE_KEY };
