import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthImportMeta extends ImportMeta {
  env: {
    BASE_URL: string;
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/user", { credentials: "include" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getBasePath = () =>
    (import.meta as AuthImportMeta).env.BASE_URL.replace(/\/+$/, "") || "/";
  const login = useCallback(() => {
    window.location.href = `/api/login?returnTo=${encodeURIComponent(`${getBasePath()}/seller-panel`)}`;
  }, []);
  const logout = useCallback(() => {
    window.location.href = `/api/logout?returnTo=${encodeURIComponent(getBasePath())}`;
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };
}