"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "@/lib/auth";
import type { User, AuthResponse, LoginInput, RegisterInput, UserTenant } from "@/types";

interface AuthContextValue {
  user: User | null;
  tenantId: string | null;
  tenants: UserTenant[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<UserTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadTenants = useCallback(async () => {
    try {
      const list = await apiClient.get<UserTenant[]>("/tenants");
      setTenants(list);
    } catch {
      // non-fatal: switcher just won't have a list
    }
  }, []);

  const hydrate = useCallback(async () => {
    const token = getAccessToken();
    const refresh = getRefreshToken();

    if (!token && !refresh) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await apiClient.get<User>("/auth/profile");
      setUser(profile);
      setTenantId(profile.tenantId ?? null);
      await loadTenants();
    } catch {
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, [loadTenants]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(
    async (data: LoginInput) => {
      const res = await apiClient.post<AuthResponse>("/auth/login", data);
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      setTenantId(res.tenantId);
      toast.success("Welcome back!");
      router.push("/dashboard");
    },
    [router]
  );

  const register = useCallback(
    async (data: RegisterInput) => {
      const res = await apiClient.post<AuthResponse>("/auth/register", data);
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      setTenantId(res.tenantId);
      toast.success("Account created!");
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      const refresh = getRefreshToken();
      if (refresh) {
        await apiClient.post("/auth/logout", { refreshToken: refresh });
      }
    } catch {
      // logout even if API fails
    } finally {
      clearTokens();
      setUser(null);
      toast.success("Logged out");
      router.push("/login");
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await apiClient.get<User>("/auth/profile");
      setUser(profile);
    } catch {
      // silent
    }
  }, []);

  const switchTenant = useCallback(
    async (targetTenantId: string) => {
      const res = await apiClient.post<AuthResponse>("/auth/switch-tenant", {
        tenantId: targetTenantId,
      });
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      setTenantId(res.tenantId);
      await loadTenants();
      // Reload tenant-scoped server/client data so the new workspace shows up.
      router.refresh();
      toast.success(`Switched to ${tenants.find((t) => t.id === targetTenantId)?.name ?? "workspace"}`);
    },
    [router, loadTenants, tenants]
  );

  const value = useMemo(
    () => ({
      user,
      tenantId,
      tenants,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
      switchTenant,
    }),
    [user, tenantId, tenants, isLoading, login, register, logout, refreshUser, switchTenant]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
