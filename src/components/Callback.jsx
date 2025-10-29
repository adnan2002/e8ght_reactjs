import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useApiFetch } from "../hooks/useApiFetch.jsx";

const REFERRER_ORIGIN = "https://accounts.google.com/";

const getCookie = (name) => {
  if (typeof document === "undefined") return null;

  const all = document.cookie || "";
  if (!all) return null;

  const parts = all.split("; ");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = decodeURIComponent(part.slice(0, eqIdx));
    if (key === name) {
      return decodeURIComponent(part.slice(eqIdx + 1));
    }
  }

  return null;
};

const clearCookie = (name, path = "/") => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
};

const parseVerifyPayload = async (response) => {
  if (!response) return null;

  const contentType = response.headers?.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json().catch(() => null);
};

export default function Callback() {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuth();
  const { request } = useApiFetch();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const referrer = document.referrer || "";
    if (!referrer.startsWith(REFERRER_ORIGIN)) {
      navigate("/login", { replace: true });
      return;
    }

    const accessToken = getCookie("access_token");
    if (!accessToken) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    const verifyAndRoute = async () => {
      try {
        const response = await request("/auth/verify", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response?.ok) {
          navigate("/login", { replace: true });
          return;
        }

        const payload = await parseVerifyPayload(response);
        if (cancelled) {
          return;
        }

        const completedOnboarding = payload?.completed_onboarding;
        const nextUser = payload?.user;

        setAccessToken(accessToken);
        if (nextUser !== undefined) {
          setUser(nextUser ?? null);
        }
        clearCookie("access_token");

        if (!completedOnboarding) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        if (!cancelled) {
          navigate("/login", { replace: true });
        }
      }
    };

    verifyAndRoute();

    return () => {
      cancelled = true;
    };
  }, [navigate, request, setAccessToken, setUser]);

  return null;
}


