import { readStoredUser, writeStoredUser } from "./storage";

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

  ensureContinuation(shouldContinue);

  let token = accessToken ?? null;

  if (user) {
    return { user, token };
  }

  const storedUser = readStoredUser();
  if (storedUser) {
    if (setUser) {
      setUser(storedUser);
    }
    return { user: storedUser, token };
  }

  try {
    ensureContinuation(shouldContinue);

    const fetchedUser = await fetchUserProfile(
      authenticatedFetch,
      token,
      shouldContinue
    );

    ensureContinuation(shouldContinue);

    writeStoredUser(fetchedUser);
    if (setUser) {
      setUser(fetchedUser);
    }
    return { user: fetchedUser, token };
  } catch (initialError) {
    if (initialError?.name === "ResolveCurrentUserCancelled") {
      throw initialError;
    }
    // If authentication failed, redirect to login immediately
    if (
      initialError?.status === 401 ||
      initialError?.status === 403
    ) {
      window.location.replace("/login");
      // Stop further execution
      return new Promise(() => {});
    }
    // Continue to refresh flow for other errors
  }


  ensureContinuation(shouldContinue);

  const refreshedToken = await authenticatedFetch.refreshSession();

  ensureContinuation(shouldContinue);

  if (!refreshedToken) {
    throw new Error("Unable to refresh session");
  }

  token = refreshedToken;

  if (setAccessToken) {
    setAccessToken(refreshedToken);
  }

  ensureContinuation(shouldContinue);

  const fetchedAfterRefresh = await fetchUserProfile(
    authenticatedFetch,
    token,
    shouldContinue
  );

  ensureContinuation(shouldContinue);

  writeStoredUser(fetchedAfterRefresh);
  if (setUser) {
    setUser(fetchedAfterRefresh);
  }

  return { user: fetchedAfterRefresh, token };
};

