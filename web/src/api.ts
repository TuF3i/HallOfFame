import type { AdminUser, AuthTokens, LoginLog, Profile, Quote, Speaker } from "./types";
import {
  cloneLoginLog,
  cloneQuote,
  cloneSpeaker,
  cloneUser,
  initialMockLoginLogs,
  initialMockQuotes,
  initialMockUsers,
  mockAttachmentUrl,
  paginate,
  speakersFromQuotes,
  type PageResult,
} from "./mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";
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

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("hof:session-expired"));
      throw new ApiError("Session expired. Please login again.", 401);
    }

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



const realApi = {
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

  async createQuote(formData: FormData): Promise<void> {
    await request<void>("/api/admin/quotes", {
      method: "POST",
      body: formData,
    }, true);
  },

  async speakerQuotes(qqNumber: string, page = 1, pageSize = 10): Promise<PageResult<Quote>> {
    return request<PageResult<Quote>>(
      `/api/quotes/speakers/${encodeURIComponent(qqNumber)}/quotes?page=${page}&page_size=${pageSize}`,
      {},
      true,
    );
  },

  async featuredQuotes(page = 1, pageSize = 10): Promise<PageResult<Quote>> {
    return request<PageResult<Quote>>(
      `/api/quotes/featured?page=${page}&page_size=${pageSize}`,
      {},
      true,
    );
  },

  async listSpeakers(page = 1, pageSize = 50): Promise<PageResult<Speaker>> {
    return request<PageResult<Speaker>>(`/api/quotes/speakers?page=${page}&page_size=${pageSize}`, {}, true);
  },

  async deleteSpeaker(qqNumber: string): Promise<void> {
    await request<void>(`/api/admin/speakers/${qqNumber}`, {
      method: "DELETE",
    }, true);
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const data = await request<{
      access_token: string;
      refresh_token: string;
    }>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
  },

  getQuoteAttachment(qid: string, attId: string): string {
    const tokens = tokenStore.read();
    const token = tokens?.access_token ?? "";
    return `${API_BASE_URL}/api/quotes/attachments/${qid}/${attId}?token=${encodeURIComponent(token)}`;
  },
};

const mockState = {
  quotes: initialMockQuotes.map(cloneQuote),
  users: initialMockUsers.map(cloneUser),
  logs: initialMockLoginLogs.map(cloneLoginLog),
  hiddenSpeakerIds: new Set<string>(),
  uploadAttachments: new Map<string, string>(),
};

function delay<T>(value: T, ms = 110): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

function clonePage<T>(page: PageResult<T>, cloneItem: (item: T) => T): PageResult<T> {
  return {
    ...page,
    items: page.items.map(cloneItem),
  };
}

function createMockJwt(email: string, role: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({ sub: email, role, exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 }));
  return `${header}.${payload}.mock-signature`;
}

function base64UrlEncode(value: string): string {
  return window.btoa(value).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function createMockProfile(email: string, nickname?: string): Profile {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = mockState.users.find((user) => user.email.toLowerCase() === normalizedEmail);
  const role = normalizedEmail === "operator@hall.local" || normalizedEmail.includes("admin") ? "admin" : existingUser?.role ?? "user";

  return {
    uid: existingUser?.uid ?? `mock-user-${normalizedEmail.replace(/[^a-z0-9]+/g, "-")}`,
    email: normalizedEmail,
    nickname: nickname?.trim() || existingUser?.nickname || normalizedEmail.split("@")[0] || "Mock User",
    role,
  };
}

function createAuthResult(profile: Profile): { tokens: AuthTokens; user: Profile } {
  return {
    tokens: {
      access_token: createMockJwt(profile.email, profile.role),
      refresh_token: "mock-refresh-token",
    },
    user: profile,
  };
}

function recordLogin(email: string, result: LoginLog["result"]): void {
  mockState.logs.unshift({
    id: `log-${String(mockState.logs.length + 1).padStart(3, "0")}`,
    at: new Date().toISOString().slice(0, 19).replace("T", " "),
    email,
    ip: "127.0.0.1",
    result,
  });
}

function parseJsonField<T extends object>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    return { ...fallback, ...(JSON.parse(value) as Partial<T>) };
  } catch {
    return fallback;
  }
}

const mockApi = {
  async login(email: string, _password: string): Promise<{ tokens: AuthTokens; user: Profile }> {
    const profile = createMockProfile(email);
    recordLogin(profile.email, "success");
    return delay(createAuthResult(profile));
  },

  async register(email: string, _password: string, nickname: string): Promise<{ tokens: AuthTokens; user: Profile }> {
    const profile = createMockProfile(email, nickname);
    const userExists = mockState.users.some((user) => user.uid === profile.uid);

    if (!userExists && (profile.role === "admin" || profile.role === "user" || profile.role === "banned")) {
      mockState.users.unshift({
        uid: profile.uid,
        email: profile.email,
        nickname: profile.nickname,
        role: profile.role,
        last_login: new Date().toISOString().slice(0, 19).replace("T", " "),
        enabled: profile.role !== "banned",
      });
    }

    recordLogin(profile.email, "success");
    return delay(createAuthResult(profile));
  },

  async quotes(): Promise<Quote[]> {
    return delay(mockState.quotes.map(cloneQuote));
  },

  async adminUsers(page = 1, pageSize = 20): Promise<PageResult<AdminUser>> {
    return delay(clonePage(paginate(mockState.users, page, pageSize), cloneUser));
  },

  async updateUserRole(uid: string, role: string): Promise<void> {
    if (role !== "admin" && role !== "user" && role !== "banned") {
      throw new ApiError("Unsupported mock role.", 400);
    }

    mockState.users = mockState.users.map((user) => (
      user.uid === uid ? { ...user, role, enabled: role !== "banned" } : user
    ));
    return delay(undefined);
  },

  async loginLogs(): Promise<LoginLog[]> {
    return delay(mockState.logs.map(cloneLoginLog));
  },

  async toggleFeaturedQuote(qid: string, featured: boolean): Promise<void> {
    mockState.quotes = mockState.quotes.map((quote) => (quote.qid === qid ? { ...quote, is_featured: featured } : quote));
    return delay(undefined);
  },

  async deleteQuote(qid: string): Promise<void> {
    mockState.quotes = mockState.quotes.filter((quote) => quote.qid !== qid);
    return delay(undefined);
  },

  async createQuote(formData: FormData): Promise<void> {
    const userdata = parseJsonField(formData.get("userdata"), { qqnumber: "10000", speaker: "Mock Speaker" });
    const groupdata = parseJsonField(formData.get("groupdata"), { groupnumber: "000000", groupname: "Mock Group" });
    const qid = `Q-MOCK-${String(mockState.quotes.length + 1).padStart(3, "0")}`;
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);
    const attachmentid = files.map((file, index) => {
      const attId = `upload-${Date.now()}-${index}`;
      if (file.type.startsWith("image/")) {
        mockState.uploadAttachments.set(`${qid}:${attId}`, URL.createObjectURL(file));
      }
      return attId;
    });

    mockState.quotes.unshift({
      qid,
      content: String(formData.get("content") ?? "手动创建的 Mock 言论"),
      suppression: Number(formData.get("suppression") ?? 0),
      userdata,
      groupdata,
      attachmentid,
      is_featured: false,
      created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    });

    return delay(undefined);
  },

  async speakerQuotes(qqNumber: string, page = 1, pageSize = 10): Promise<PageResult<Quote>> {
    const speakers = speakersFromQuotes(mockState.quotes, mockState.hiddenSpeakerIds);
    const speaker = speakers.find((s) => s.qqnumber === qqNumber);
    if (!speaker) {
      return delay({ items: [], total: 0, page, page_size: pageSize });
    }
    const allQuotes = mockState.quotes.filter((q) => q.userdata?.qqnumber === qqNumber);
    return delay(clonePage(paginate(allQuotes, page, pageSize), cloneQuote));
  },

  async featuredQuotes(page = 1, pageSize = 10): Promise<PageResult<Quote>> {
    const featured = mockState.quotes.filter((q) => q.is_featured);
    return delay(clonePage(paginate(featured, page, pageSize), cloneQuote));
  },

  async listSpeakers(page = 1, pageSize = 50): Promise<PageResult<Speaker>> {
    const speakers = speakersFromQuotes(mockState.quotes, mockState.hiddenSpeakerIds);
    return delay(clonePage(paginate(speakers, page, pageSize), cloneSpeaker));
  },

  async deleteSpeaker(qqNumber: string): Promise<void> {
    mockState.hiddenSpeakerIds.add(qqNumber);
    return delay(undefined);
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    return delay({
      access_token: createMockJwt("operator@hall.local", "admin"),
      refresh_token: refreshToken || "mock-refresh-token",
    });
  },

  getQuoteAttachment(qid: string, attId: string): string {
    return mockState.uploadAttachments.get(`${qid}:${attId}`) ?? mockAttachmentUrl(qid, attId);
  },
};

export const api = USE_MOCK_API ? mockApi : realApi;
