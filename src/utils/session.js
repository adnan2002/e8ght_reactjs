import { readStoredUser } from "./storage";

export const isOnboarded = (profile) => {
  if (!profile || typeof profile !== "object") {
    return false;
  }

  const value =
    profile.completed_onboarding ?? profile.completedOnboarding ?? false;

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    if (normalized === "true" || normalized === "1") {
      return true;
    }

    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return Boolean(value);
};

const createResolveCancelledError = () => {
  const error = new Error("resolveCurrentUser cancelled");
  error.name = "ResolveCurrentUserCancelled";
  return error;
};

const ensureContinuation = (shouldContinue) => {
  if (typeof shouldContinue === "function" && !shouldContinue()) {
    throw createResolveCancelledError();
  }
};

const extractUserPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return payload.user ?? payload;
};

const fetchUserProfile = async (authenticatedFetch, token, shouldContinue) => {
  ensureContinuation(shouldContinue);

  const config = {
    disableRefresh: true,
  };

  if (token) {
    config.tokenOverride = token;
  }

  const payload = await authenticatedFetch.requestJson(
    "/users/me",
    { method: "GET" },
    config
  );

  ensureContinuation(shouldContinue);

  const user = extractUserPayload(payload);

  if (!user || typeof user !== "object") {
    throw new Error("Missing user payload");
  }

  ensureContinuation(shouldContinue);

  return user;
};

export const resolveCurrentUser = async ({
  accessToken,
  user,
  setUser,
  setAccessToken,
  authenticatedFetch,
  shouldContinue,
}) => {
  if (!authenticatedFetch) {
    throw new Error("resolveCurrentUser requires authenticatedFetch");
  }

  if (typeof setUser !== "function") {
    throw new Error("resolveCurrentUser requires setUser callback");
  }

  ensureContinuation(shouldContinue);

  const redirectToLogin = () => {
    window.location.replace("/login");
    return new Promise(() => {});
  };

  const attemptFetchWithToken = async (activeToken) => {
    ensureContinuation(shouldContinue);

    const fetchedUser = await fetchUserProfile(
      authenticatedFetch,
      activeToken,
      shouldContinue
    );

    ensureContinuation(shouldContinue);

    setUser(fetchedUser);

    return { user: fetchedUser, token: activeToken ?? null };
  };

  let token = accessToken ?? null;

  if (user) {
    return { user, token };
  }

  const storedUser = readStoredUser();
  if (storedUser) {
    setUser(storedUser);
    return { user: storedUser, token };
  }

  if (token) {
    try {
      return await attemptFetchWithToken(token);
    } catch (initialError) {
      if (initialError?.name === "ResolveCurrentUserCancelled") {
        throw initialError;
      }
      // Continue to refresh flow for expired or invalid tokens
    }
  }


  ensureContinuation(shouldContinue);

  const refreshedToken = await authenticatedFetch.refreshSession();

  ensureContinuation(shouldContinue);

  if (!refreshedToken) {
    return redirectToLogin();
  }

  token = refreshedToken;

  if (setAccessToken) {
    setAccessToken(refreshedToken);
  }

  try {
    return await attemptFetchWithToken(token);
  } catch (finalError) {
    if (finalError?.name === "ResolveCurrentUserCancelled") {
      throw finalError;
    }

    if (finalError?.status === 401 || finalError?.status === 403) {
      return redirectToLogin();
    }

    throw finalError;
  }
};

