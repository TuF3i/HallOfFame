export type View = "auth" | "archive" | "admin";

export type AuthMode = "login" | "register";

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
}

export interface Profile {
  uid: string;
  email: string;
  nickname: string;
  role: "user" | "admin" | "banned" | string;
}

export interface Quote {
  qid: string;
  content: string;
  suppression: number;
  ai_comment?: string;
  userdata: {
    qqnumber: string;
    speaker: string;
    avatar?: string;
  };
  groupdata: {
    groupnumber: string;
    groupname?: string;
    avatar?: string;
  };
  attachmentid: string[];
  is_featured: boolean;
  created_at?: string;
}

export interface QuotePerson {
  id: string;
  name: string;
  qqnumber: string;
  quoteCount: number;
  qqGroup: string;
  role: string;
  signal: string;
  portrait: "circles" | "slices" | "halo" | "mesh";
  featuredQuote?: Quote;
  history?: Quote[];
}

export interface AdminUser {
  uid: string;
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

export interface Speaker {
  qqnumber: string;
  speaker: string;
  avatar?: string;
  quote_count: number;
}
