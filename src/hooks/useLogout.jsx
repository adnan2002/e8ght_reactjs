import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthenticatedFetch } from "./useAuthenticatedFetch.jsx";
import { useAuth } from "./useAuth.jsx";
import { clearStoredAddress } from "../utils/storage";

export const useLogout = () => {
  const authenticatedFetch = useAuthenticatedFetch();
  const { setAccessToken, setUser } = useAuth();
  const navigate = useNavigate();

  return useCallback(async () => {
    try {
      await authenticatedFetch("/sessions/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.warn("Failed to log out cleanly", error);
    } finally {
      setAccessToken(null);
      setUser(null);
      clearStoredAddress();
      navigate("/", { replace: true });
    }
  }, [authenticatedFetch, navigate, setAccessToken, setUser]);
};


