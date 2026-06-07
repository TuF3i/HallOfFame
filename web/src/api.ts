import type { AdminUser, AuthTokens, LoginLog, Profile, Quote } from "./types";

interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

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
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthTokens>;
      return typeof parsed.access_token === "string" ? { access_token: parsed.access_token, refresh_token: parsed.refresh_token } : null;
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
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(`Request failed with HTTP ${response.status}.`, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const body = (await response.json()) as { code: number; msg: string; data: T };

    if (body.code !== 10200) {
      throw new ApiError(body.msg || "Business error.", body.code);
    }

    return body.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please check the API service.", 0);
    }
    throw new ApiError("Network request failed. Showing local preview data.", 0);
  } finally {
    window.clearTimeout(timeoutId);
  }
}



export const api = {
  async login(email: string, password: string): Promise<{ tokens: AuthTokens; user: Profile }> {
    const data = await request<{
      access_token: string;
      refresh_token?: string;
      user: { uid: string; email: string; nickname: string; role: string };
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return {
      tokens: { access_token: data.access_token, refresh_token: data.refresh_token },
      user: data.user as Profile,
    };
  },

  async register(email: string, password: string, nickname: string): Promise<{ tokens: AuthTokens; user: Profile }> {
    const data = await request<{
      access_token: string;
      refresh_token?: string;
      uid: string;
      email: string;
      nickname: string;
      role: string;
    }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, nickname }),
    });
    return {
      tokens: { access_token: data.access_token, refresh_token: data.refresh_token },
      user: { uid: data.uid, email: data.email, nickname: data.nickname, role: data.role } as Profile,
    };
  },

  async quotes(): Promise<Quote[]> {
    try {
      const data = await request<PageResult<Quote>>("/api/admin/quotes?page=1&page_size=80", {}, true);
      return data.items;
    } catch {
      const data = await request<PageResult<Quote>>("/api/quotes/featured?page=1&page_size=80", {}, true);
      return data.items;
    }
  },

  async adminUsers(page = 1, pageSize = 20): Promise<PageResult<AdminUser>> {
    return request<PageResult<AdminUser>>(`/api/admin/users?page=${page}&page_size=${pageSize}`, {}, true);
  },

  async updateUserRole(uid: string, role: string): Promise<void> {
    await request<void>(`/api/admin/users/${uid}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }, true);
  },

  async loginLogs(): Promise<LoginLog[]> {
    const data = await request<PageResult<LoginLog>>("/api/admin/login-logs?page=1&page_size=30", {}, true);
    return data.items;
  },

  async toggleFeaturedQuote(qid: string, featured: boolean): Promise<void> {
    await request<void>(`/api/admin/quotes/${qid}/featured`, {
      method: "PUT",
      body: JSON.stringify({ featured }),
    }, true);
  },

  async deleteQuote(qid: string): Promise<void> {
    await request<void>(`/api/admin/quotes/${qid}`, {
      method: "DELETE",
    }, true);
  },
};
