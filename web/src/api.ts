import { mockGroups, mockLoginLogs, mockPeople, mockProfile, mockUsers } from "./mockData";
import type { AdminUser, AuthTokens, GroupInfo, LoginLog, Profile, Quote } from "./types";

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
  if (!API_BASE_URL) {
    throw new ApiError("API base URL is not configured.", 0);
  }

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

    return (await response.json()) as T;
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

function delay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

async function withFallback<T>(remote: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await remote();
  } catch {
    return delay(fallback);
  }
}

export const api = {
  async login(email: string, password: string): Promise<AuthTokens> {
    const fallback = {
      access_token: `preview.${btoa(`${email}:${password}`).slice(0, 18)}.token`,
      refresh_token: "preview.refresh.token",
    };
    return withFallback(
      () =>
        request<AuthTokens>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      fallback,
    );
  },

  async register(email: string, password: string, nickname: string): Promise<AuthTokens> {
    return withFallback(
      async () => {
        await request<void>("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, nickname }),
        });
        return api.login(email, password);
      },
      {
        access_token: `preview.${btoa(`${email}:${nickname}`).slice(0, 18)}.token`,
        refresh_token: "preview.refresh.token",
      },
    );
  },

  async profile(): Promise<Profile> {
    return withFallback(() => request<Profile>("/user/profile", {}, true), mockProfile);
  },

  async quotes(): Promise<Quote[]> {
    const fallback = mockPeople.flatMap((person) => [person.featuredQuote, ...person.history]);
    return withFallback(() => request<Quote[]>("/quotes?page=1&page_size=80"), fallback);
  },

  async groups(): Promise<GroupInfo[]> {
    return withFallback(() => request<GroupInfo[]>("/groups"), mockGroups);
  },

  async adminUsers(): Promise<AdminUser[]> {
    return withFallback(() => request<AdminUser[]>("/admin/users", {}, true), mockUsers);
  },

  async loginLogs(): Promise<LoginLog[]> {
    return withFallback(() => request<LoginLog[]>("/admin/login-logs?page=1&page_size=30", {}, true), mockLoginLogs);
  },
};
