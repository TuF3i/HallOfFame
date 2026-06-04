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
  role: string;
}

export interface Quote {
  id: string;
  qq_group: string;
  speaker: string;
  content: string;
  created_at: string;
  is_featured: boolean;
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
}

export interface AdminUser {
  ID: number;
  Email: string;
  Nickname: string;
  Role: string;
  CreatedAt: string;
}

export interface LoginLog {
  ID: number;
  UserID: number;
  IP: string;
  Success: boolean;
  FailReason: string;
  CreatedAt: string;
}

export interface WhitelistEntry {
  ID: number;
  Email: string;
  AddedBy: number;
  CreatedAt: string;
}
