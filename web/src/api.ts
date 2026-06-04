import type { AdminUser, AuthTokens, GroupInfo, LoginLog, Profile, Quote, WhitelistEntry } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
const REQUEST_TIMEOUT_MS = 8_000;
const TOKEN_STORAGE_KEY = "hall-of-fame.tokens";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const tokenStore = {
  read(): AuthTokens | null {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<AuthTokens>;
      return typeof parsed.access_token === "string"
        ? { access_token: parsed.access_token, refresh_token: parsed.refresh_token }
        : null;
    } catch {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
  },
  write(tokens: AuthTokens) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  },
  clear() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

async function request<T>(path: string, init: RequestInit = {}, withAuth = false): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(init.headers);
  const tokens = tokenStore.read();

  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (withAuth && tokens?.access_token) {
    headers.set("Authorization", `Bearer ${tokens.access_token}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError((body as { error?: string }).error ?? `请求失败 (HTTP ${response.status})`, response.status);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("请求超时。", 0);
    }
    throw new ApiError("网络请求失败，请确认后端服务已启动。", 0);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

let refreshPromise: Promise<AuthTokens> | null = null;

async function refreshTokens(): Promise<AuthTokens> {
  if (refreshPromise) return refreshPromise;
  const tokens = tokenStore.read();
  if (!tokens?.refresh_token) {
    tokenStore.clear();
    throw new ApiError("登录已过期，请重新登录。", 401);
  }
  refreshPromise = (async () => {
    try {
      const result = await request<{ access_token: string }>(
        "/api/v1/auth/refresh",
        { method: "POST", body: JSON.stringify({ refresh_token: tokens.refresh_token }) },
        false,
      );
      const newTokens: AuthTokens = { access_token: result.access_token, refresh_token: tokens.refresh_token };
      tokenStore.write(newTokens);
      return newTokens;
    } catch {
      tokenStore.clear();
      throw new ApiError("登录已过期，请重新登录。", 401);
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function authedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, init, true);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await refreshTokens();
      return await request<T>(path, init, true);
    }
    throw error;
  }
}

export const api = {
  async login(email: string, password: string): Promise<AuthTokens> {
    return request<AuthTokens>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async register(email: string, password: string, nickname: string): Promise<void> {
    await request<{ message: string }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, nickname }),
    });
  },

  async profile(): Promise<Profile> {
    return authedRequest<Profile>("/api/v1/user/profile");
  },

  async quotes(): Promise<Quote[]> {
    const data = await request<{ quotes: Quote[]; total: number; page: number; page_size: number }>(
      "/api/v1/quotes?page=1&page_size=80",
    );
    return data.quotes ?? [];
  },

  async groups(): Promise<GroupInfo[]> {
    const data = await request<{ groups: GroupInfo[] }>("/api/v1/groups");
    return data.groups ?? [];
  },

  async deleteQuote(id: string): Promise<void> {
    await authedRequest(`/api/v1/quotes/${id}`, { method: "DELETE" });
  },

  async toggleFeatured(id: string, featured: boolean): Promise<void> {
    await authedRequest(`/api/v1/quotes/${id}/feature`, {
      method: "PUT",
      body: JSON.stringify({ featured }),
    });
  },

  async adminUsers(): Promise<AdminUser[]> {
    const data = await authedRequest<{ users: AdminUser[] }>("/api/v1/admin/users");
    return data.users ?? [];
  },

  async adminUpdateRole(id: number, role: string): Promise<void> {
    await authedRequest(`/api/v1/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  },

  async adminWhitelist(): Promise<WhitelistEntry[]> {
    const data = await authedRequest<{ whitelist: WhitelistEntry[] }>("/api/v1/admin/whitelist");
    return data.whitelist ?? [];
  },

  async adminWhitelistAdd(email: string): Promise<void> {
    await authedRequest("/api/v1/admin/whitelist", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async adminWhitelistRemove(id: number): Promise<void> {
    await authedRequest(`/api/v1/admin/whitelist/${id}`, { method: "DELETE" });
  },

  async loginLogs(): Promise<LoginLog[]> {
    const data = await authedRequest<{ logs: LoginLog[] }>("/api/v1/admin/login-logs?page=1&page_size=30");
    return data.logs ?? [];
  },
};
