export type View = "auth" | "archive" | "admin";

export type AuthMode = "login" | "register";

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
}

export interface Profile {
  id: number;
  email: string;
  nickname: string;
  role: "user" | "admin" | "banned" | string;
}

export interface Quote {
  id: string;
  qq_group: string;
  speaker: string;
  content: string;
  created_at: string;
  is_featured: boolean;
  image_url?: string;
}

export interface QuotePerson {
  id: string;
  name: string;
  qqGroup: string;
  role: string;
  signal: string;
  portrait: "circles" | "slices" | "halo" | "mesh";
  featuredQuote: Quote;
  history: Quote[];
}

export interface GroupInfo {
  id: string;
  name: string;
  member_count: number;
  quote_count: number;
  sync_status: "online" | "syncing" | "offline";
}

export interface AdminUser {
  id: number;
  email: string;
  nickname: string;
  role: "user" | "admin" | "banned";
  last_login: string;
  enabled: boolean;
}

export interface LoginLog {
  id: string;
  at: string;
  email: string;
  ip: string;
  result: "success" | "failed";
}
