import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, Dispatch, FocusEvent, FormEvent, SetStateAction } from "react";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Eye,
  FileText,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  MousePointer2,
  Palette,
  Plus,
  Power,
  RefreshCcw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api, tokenStore } from "./api";
import { FluidShader } from "./components/FluidShader";

import type { AdminUser, AuthMode, AuthTokens, LoginLog, Profile, Quote, QuotePerson, Speaker, View } from "./types";

const views: View[] = ["auth", "archive", "admin"];
const navViews: Array<{ id: Exclude<View, "auth">; label: string; icon: typeof KeyRound }> = [
  { id: "archive", label: "ARCHIVE", icon: Archive },
  { id: "admin", label: "ADMIN", icon: LayoutDashboard },
];

const PACK_PREVIEW_DELAY_MS = 120;
const VIRTUAL_LIST_OVERSCAN = 6;
const ADMIN_LOG_ROW_HEIGHT = 28;
const ADMIN_LOG_MAX_VISIBLE_ROWS = 18;
const ADMIN_QUOTE_PAGE_SIZE = 8;
const PROFILE_STORAGE_KEY = "hof.profile";
const CURSOR_SETTINGS_STORAGE_KEY = "hof.cursor-settings";
const APP_SETTINGS_STORAGE_KEY = "hof.app-settings";
const DEFAULT_CURSOR_SETTINGS: CursorSettings = {
  enabled: false,
  idleSize: 32,
  interactiveSize: 24,
  color: "#e8ddc9",
  clickMaskColor: "#080808",
  delayedFollow: true,
};
const DEFAULT_APP_SETTINGS: AppSettings = {
  backgroundColor: "#f4f4f1",
};
const CURSOR_SIZE_LIMITS = {
  idleSize: { min: 18, max: 56 },
  interactiveSize: { min: 12, max: 44 },
};

interface CursorSettings {
  enabled: boolean;
  idleSize: number;
  interactiveSize: number;
  color: string;
  clickMaskColor: string;
  delayedFollow: boolean;
}

interface AppSettings {
  backgroundColor: string;
}

interface PageVirtualListProps<Item> {
  items: Item[];
  rowHeight: number;
  className: string;
  rowClassName: string;
  maxVisibleRows: number;
  getKey: (item: Item, index: number) => React.Key;
  renderRow: (item: Item, index: number) => React.ReactNode;
}

function clampSize(value: unknown, key: keyof typeof CURSOR_SIZE_LIMITS, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  const { min, max } = CURSOR_SIZE_LIMITS[key];
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function normalizeCursorSettings(value: Partial<CursorSettings> | null | undefined): CursorSettings {
  return {
    enabled: typeof value?.enabled === "boolean" ? value.enabled : DEFAULT_CURSOR_SETTINGS.enabled,
    idleSize: clampSize(value?.idleSize, "idleSize", DEFAULT_CURSOR_SETTINGS.idleSize),
    interactiveSize: clampSize(
      value?.interactiveSize,
      "interactiveSize",
      DEFAULT_CURSOR_SETTINGS.interactiveSize,
    ),
    color: isHexColor(value?.color) ? value.color : DEFAULT_CURSOR_SETTINGS.color,
    clickMaskColor: isHexColor(value?.clickMaskColor)
      ? value.clickMaskColor
      : DEFAULT_CURSOR_SETTINGS.clickMaskColor,
    delayedFollow: typeof value?.delayedFollow === "boolean" ? value.delayedFollow : DEFAULT_CURSOR_SETTINGS.delayedFollow,
  };
}

function normalizeAppSettings(value: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    backgroundColor: isHexColor(value?.backgroundColor) ? value.backgroundColor : DEFAULT_APP_SETTINGS.backgroundColor,
  };
}

function loadCursorSettings() {
  try {
    const storedValue = window.localStorage.getItem(CURSOR_SETTINGS_STORAGE_KEY);
    return storedValue ? normalizeCursorSettings(JSON.parse(storedValue) as Partial<CursorSettings>) : DEFAULT_CURSOR_SETTINGS;
  } catch {
    return DEFAULT_CURSOR_SETTINGS;
  }
}

function loadAppSettings() {
  try {
    const storedValue = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    return storedValue ? normalizeAppSettings(JSON.parse(storedValue) as Partial<AppSettings>) : DEFAULT_APP_SETTINGS;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

function getFeaturedQuoteIds(quotes: Quote[]) {
  return quotes.filter((quote) => quote.is_featured).map((quote) => quote.qid);
}

function PageVirtualList<Item>({
  items,
  rowHeight,
  className,
  rowClassName,
  maxVisibleRows,
  getKey,
  renderRow,
}: PageVirtualListProps<Item>) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [visibleRange, setVisibleRange] = useState(() => ({
    start: 0,
    end: Math.min(items.length, VIRTUAL_LIST_OVERSCAN * 2),
  }));

  useEffect(() => {
    let frameId = 0;

    const updateRange = () => {
      frameId = 0;
      const listElement = listRef.current;

      if (!listElement || !items.length) {
        setVisibleRange({ start: 0, end: 0 });
        return;
      }

      const viewportHeight = listElement.clientHeight;
      const start = Math.max(0, Math.floor(listElement.scrollTop / rowHeight) - VIRTUAL_LIST_OVERSCAN);
      const end = Math.min(
        items.length,
        Math.ceil((listElement.scrollTop + viewportHeight) / rowHeight) + VIRTUAL_LIST_OVERSCAN,
      );
      const nextRange = { start, end: Math.max(start, end) };

      setVisibleRange((current) =>
        current.start === nextRange.start && current.end === nextRange.end ? current : nextRange,
      );
    };

    const queueUpdate = () => {
      if (!frameId) {
        frameId = window.requestAnimationFrame(updateRange);
      }
    };

    const scrollElement = listRef.current;

    queueUpdate();
    scrollElement?.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate, { passive: true });

    return () => {
      scrollElement?.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [items.length, rowHeight]);

  const totalHeight = items.length * rowHeight;
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const listMaxHeight = Math.max(1, maxVisibleRows) * rowHeight;

  return (
    <div
      ref={listRef}
      className={className}
      style={{ maxHeight: listMaxHeight, "--virtual-row-height": `${rowHeight}px` } as CSSProperties}
    >
      <div className="virtual-list-spacer" style={{ height: totalHeight }}>
        {visibleItems.map((item, offset) => {
          const index = visibleRange.start + offset;
          return (
            <div
              className={rowClassName}
              key={getKey(item, index)}
              style={{ height: rowHeight, transform: `translateY(${index * rowHeight}px)` }}
            >
              {renderRow(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getInitialView(): View {
  const hasTokens = Boolean(tokenStore.read());
  const hashView = getHashView();

  if (hashView === "auth") {
    return hashView;
  }

  if (hasTokens && hashView) {
    return hashView;
  }

  return hasTokens ? "archive" : "auth";
}

function getHashView(): View | null {
  const hashView = window.location.hash.replace("#", "") as View;
  return views.some((item) => item === hashView) ? hashView : null;
}

function createPeopleFromQuotes(quotes: Quote[]): QuotePerson[] {
  if (!quotes.length) {
    return [];
  }

  const peopleBySpeaker = new Map<string, Quote[]>();
  quotes.forEach((quote) => {
    const key = quote.userdata?.speaker || "群友匿名";
    peopleBySpeaker.set(key, [...(peopleBySpeaker.get(key) ?? []), quote]);
  });

  const portraitTypes: QuotePerson["portrait"][] = ["circles", "slices", "halo", "mesh"];
  return Array.from(peopleBySpeaker.entries())
    .slice(0, 8)
    .map(([speaker, list], index) => {
      const sorted = [...list].sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)));
      return {
        id: `${speaker}-${index}`,
        name: speaker,
        qqnumber: sorted[0]?.userdata?.qqnumber ?? "",
        quoteCount: list.length,
        qqGroup: sorted[0]?.groupdata?.groupnumber ?? "UNKNOWN",
        role: index % 2 === 0 ? "群内高频发言人" : "档案收录对象",
        signal: `DAY ${String(13 + index * 2).padStart(2, "0")} / DISK ${String.fromCharCode(65 + index)}`,
        portrait: portraitTypes[index % portraitTypes.length],
        featuredQuote: sorted[0],
        history: [...sorted].reverse(),
      };
    });
}

function parseJwtExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function App() {
  const [view, setView] = useState<View>(getInitialView);
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [userPage, setUserPage] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [cursorSettings, setCursorSettings] = useState<CursorSettings>(loadCursorSettings);
  const [appSettings, setAppSettings] = useState<AppSettings>(loadAppSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const appShellRef = useRef<HTMLElement | null>(null);
  const people = useMemo(() => createPeopleFromQuotes(quotes), [quotes]);
  const featuredQuoteIds = useMemo(() => getFeaturedQuoteIds(quotes), [quotes]);
  const isAdmin = profile?.role === "admin";
  const visibleView = view === "admin" && !isAdmin ? "archive" : view;

  useEffect(() => {
    const nextHash = `#${view}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
    appShellRef.current?.scrollTo({ left: 0, top: 0 });
    window.scrollTo({ left: 0, top: 0 });
  }, [view]);

  useEffect(() => {
    const handleHashChange = () => {
      const hashView = getHashView();

      if (!hashView) {
        return;
      }

      if (hashView !== "auth" && !tokenStore.read()) {
        setView("auth");
        return;
      }

      setView(hashView);
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function load() {
      setIsLoading(true);
      try {
        const quoteResult = await api.quotes();

        if (!isActive) {
          return;
        }

        setQuotes(quoteResult);
      } catch {
        // API unreachable — keep empty state
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (profile?.role !== "admin") {
      return;
    }

    let isActive = true;

    async function loadAdmin() {
      try {
        const [userResult, logResult] = await Promise.all([
          api.adminUsers(userPage + 1, 4),
          api.loginLogs(),
        ]);

        if (!isActive) {
          return;
        }

        setAdminUsers(userResult.items);
        setUserTotal(userResult.total);
        setLoginLogs(logResult);
      } catch {
        // Admin data unavailable — keep empty state
      }
    }

    void loadAdmin();

    return () => {
      isActive = false;
    };
  }, [profile, userPage]);

  useEffect(() => {
    if (view === "admin" && profile && !isAdmin) {
      setView("archive");
    }
  }, [isAdmin, profile, view]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CURSOR_SETTINGS_STORAGE_KEY, JSON.stringify(cursorSettings));
    } catch {
      // Cursor preferences are cosmetic; storage failures should never block the dashboard.
    }
  }, [cursorSettings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
    } catch {
      // App colors are local preferences; storage failures should not block navigation.
    }
  }, [appSettings]);

  // Token refresh mechanism
  useEffect(() => {
    const handleSessionExpired = () => {
      setSessionExpired(true);
    };

    window.addEventListener("hof:session-expired", handleSessionExpired);

    const tokens = tokenStore.read();
    if (!tokens?.access_token) {
      window.removeEventListener("hof:session-expired", handleSessionExpired);
      return;
    }

    const expiry = parseJwtExpiry(tokens.access_token);
    if (!expiry) {
      window.removeEventListener("hof:session-expired", handleSessionExpired);
      return;
    }

    // Refresh 5 minutes before expiry, or immediately if already expired
    const msUntilRefresh = Math.max(0, expiry - Date.now() - 5 * 60 * 1000);

    const refreshTimer = window.setTimeout(async () => {
      if (!tokens.refresh_token) {
        // No refresh token available, session expired
        setSessionExpired(true);
        return;
      }

      try {
        const newTokens = await api.refreshToken(tokens.refresh_token);
        tokenStore.write(newTokens);
        setSessionExpired(false);
      } catch {
        // Refresh failed, session expired
        setSessionExpired(true);
      }
    }, msUntilRefresh);

    return () => {
      window.removeEventListener("hof:session-expired", handleSessionExpired);
      window.clearTimeout(refreshTimer);
    };
  }, [profile]);

  const handleAuthenticated = (result: { tokens: AuthTokens; user: Profile }) => {
    tokenStore.write(result.tokens);
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(result.user));
    } catch {}
    setProfile(result.user);
    setView("archive");
  };

  const handleSignOut = () => {
    tokenStore.clear();
    try {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {}
    setSettingsOpen(false);
    setView("auth");
  };

  const handleToggleFeaturedQuote = (quoteId: string) => {
    setQuotes((currentQuotes) => {
      const q = currentQuotes.find((item) => item.qid === quoteId);
      if (!q) return currentQuotes;
      void api.toggleFeaturedQuote(quoteId, !q.is_featured);
      return currentQuotes.map((item) => (item.qid === quoteId ? { ...item, is_featured: !item.is_featured } : item));
    });
  };

  const handleDeleteQuote = (quoteId: string) => {
    void api.deleteQuote(quoteId);
    setQuotes((currentQuotes) => currentQuotes.filter((item) => item.qid !== quoteId));
  };

  const handleUserChange = (userId: string, patch: Partial<AdminUser>) => {
    if ("role" in patch && patch.role) {
      void api.updateUserRole(userId, patch.role);
    }
    setAdminUsers((currentUsers) => currentUsers.map((user) => (user.uid === userId ? { ...user, ...patch } : user)));
  };

  return (
    <>
      <CustomCursor settings={cursorSettings} />
      <main
        ref={appShellRef}
        className={cursorSettings.enabled ? `app app-${visibleView} is-custom-cursor` : `app app-${visibleView}`}
        style={{ "--app-background-color": appSettings.backgroundColor } as CSSProperties}
      >
        <AcidGeometry />
        {view !== "auth" && (
          <TopNav
            currentView={visibleView}
            canAccessAdmin={isAdmin}
            onChange={setView}
            profile={profile}
            onSignOut={handleSignOut}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
        )}
        {view === "auth" && <AuthPage onAuthenticated={handleAuthenticated} />}
        {visibleView === "archive" && (
          <ArchivePage
            people={people}
            loading={isLoading}
            canManageFeatured={isAdmin}
            featuredQuoteIds={featuredQuoteIds}
            onToggleFeaturedQuote={handleToggleFeaturedQuote}
          />
        )}
        {view === "admin" && isAdmin && (
          <AdminDashboard
            profile={profile}
            quotes={quotes}
            users={adminUsers}
            logs={loginLogs}
            loading={isLoading}
            featuredQuoteIds={featuredQuoteIds}
            userPage={userPage}
            userTotal={userTotal}
            onUserPageChange={setUserPage}
            onToggleFeaturedQuote={handleToggleFeaturedQuote}
            onDeleteQuote={handleDeleteQuote}
            onUserChange={handleUserChange}
          />
        )}
        {settingsOpen && (
          <SettingsPanel
            appSettings={appSettings}
            cursorSettings={cursorSettings}
            onAppSettingsChange={setAppSettings}
            onCursorSettingsChange={setCursorSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}
        {sessionExpired && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal-panel" style={{ textAlign: "center", padding: "32px" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: "1.6rem" }}>登录已过期</h2>
              <p style={{ margin: "0 0 24px", fontSize: "0.9rem", color: "rgba(8,8,8,0.62)" }}>
                您的登录会话已过期，请重新登录以继续使用。
              </p>
              <button
                className="primary-action"
                type="button"
                onClick={() => {
                  tokenStore.clear();
                  try { window.localStorage.removeItem(PROFILE_STORAGE_KEY); } catch {}
                  setSessionExpired(false);
                  setView("auth");
                }}
                style={{ width: "auto", padding: "0 32px", marginTop: 0 }}
              >
                <span>重新登录</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

interface CustomCursorProps {
  settings: CursorSettings;
}

function CustomCursor({ settings }: CustomCursorProps) {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const cursor = cursorRef.current;
    if (!settings.enabled || !finePointer.matches || !cursor) {
      return;
    }

    const interactiveSelector = [
      "a",
      "button",
      "input",
      "textarea",
      "select",
      "summary",
      "[role='button']",
      "[role='tab']",
      "[tabindex]:not([tabindex='-1'])",
      ".history-list",
    ].join(",");
    let frameId = 0;
    let clickTimerId: number | null = null;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let renderedX = targetX;
    let renderedY = targetY;

    const syncPosition = () => {
      if (settings.delayedFollow) {
        renderedX += (targetX - renderedX) * 0.34;
        renderedY += (targetY - renderedY) * 0.34;
      } else {
        renderedX = targetX;
        renderedY = targetY;
      }

      cursor.style.setProperty("--cursor-x", `${renderedX}px`);
      cursor.style.setProperty("--cursor-y", `${renderedY}px`);

      const isSettled = Math.abs(targetX - renderedX) < 0.4 && Math.abs(targetY - renderedY) < 0.4;
      if (!settings.delayedFollow || isSettled) {
        renderedX = targetX;
        renderedY = targetY;
        cursor.style.setProperty("--cursor-x", `${renderedX}px`);
        cursor.style.setProperty("--cursor-y", `${renderedY}px`);
        frameId = 0;
        return;
      }

      frameId = window.requestAnimationFrame(syncPosition);
    };

    const updateInteractiveState = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      cursor.classList.toggle("is-interactive", Boolean(element?.closest(interactiveSelector)));
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      cursor.classList.add("is-visible");
      updateInteractiveState(event.target);

      if (!frameId) {
        frameId = window.requestAnimationFrame(syncPosition);
      }
    };

    const handlePointerLeave = () => {
      cursor.classList.remove("is-visible");
    };

    const handlePointerDown = () => {
      cursor.classList.remove("is-clicking");
      void cursor.offsetWidth;
      cursor.classList.add("is-clicking");

      if (clickTimerId !== null) {
        window.clearTimeout(clickTimerId);
      }
      clickTimerId = window.setTimeout(() => {
        cursor.classList.remove("is-clicking");
        clickTimerId = null;
      }, 300);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerleave", handlePointerLeave);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (clickTimerId !== null) {
        window.clearTimeout(clickTimerId);
      }
    };
  }, [settings.enabled, settings.delayedFollow]);

  if (!settings.enabled) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className="custom-cursor"
      style={
        {
          "--cursor-size": `${settings.idleSize}px`,
          "--cursor-interactive-size": `${settings.interactiveSize}px`,
          "--cursor-color": settings.color,
          "--cursor-click-mask": settings.clickMaskColor,
          "--cursor-transform-duration": settings.delayedFollow ? "60ms" : "0ms",
        } as CSSProperties
      }
      aria-hidden="true"
    />
  );
}

interface TopNavProps {
  currentView: View;
  canAccessAdmin: boolean;
  profile: Profile | null;
  onChange: (view: View) => void;
  onSignOut: () => void;
  onSettingsOpen: () => void;
}

function TopNav({ currentView, canAccessAdmin, profile, onChange, onSignOut, onSettingsOpen }: TopNavProps) {
  const availableNavViews = canAccessAdmin ? navViews : navViews.filter((item) => item.id !== "admin");

  return (
    <nav className="top-nav" aria-label="主导航">
      <button className="brand-mark" type="button" onClick={() => undefined} aria-label="HOF 功能待定">
        <CircleDot size={18} />
        <span>HOF</span>
      </button>
      <div className="nav-switcher" role="tablist" aria-label="页面">
        {availableNavViews.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={currentView === id}
            className={currentView === id ? "nav-item is-active" : "nav-item"}
            onClick={() => onChange(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="nav-actions">
        <button className="profile-chip icon-chip" type="button" onClick={onSettingsOpen} aria-label="打开设置">
          <Settings size={15} />
          <span>SET</span>
        </button>
        <button className="profile-chip" type="button" onClick={onSignOut} aria-label="退出登录">
          <Power size={15} />
          <span>{profile?.nickname ?? "PREVIEW"}</span>
        </button>
      </div>
    </nav>
  );
}

function AcidGeometry() {
  return (
    <div className="acid-geometry" aria-hidden="true">
      <span className="geo geo-a" />
      <span className="geo geo-b" />
      <span className="geo geo-c" />
      <span className="geo geo-d" />
      <span className="geo geo-e" />
      <span className="geo geo-f" />
    </div>
  );
}

interface AuthPageProps {
  onAuthenticated: (result: { tokens: AuthTokens; user: Profile }) => void;
}

function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("operator@hall.local");
  const [password, setPassword] = useState("hallfame");
  const [nickname, setNickname] = useState("Archive Operator");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = mode === "login" ? "进入档案" : "创建席位";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("请输入有效邮箱。");
      return;
    }

    if (password.length < 5) {
      setError("密码至少 5 位。");
      return;
    }

    setIsSubmitting(true);
    try {
      const tokens =
        mode === "login" ? await api.login(email, password) : await api.register(email, password, nickname || email);
      onAuthenticated(tokens);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "登录失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <FluidShader />
      <div className="rotated-note note-left">VERSION 1.0 / HALL OF FAME</div>
      <div className="rotated-note note-right">COPYRIGHT 2026 / QQ ARCHIVE</div>
      <form className="auth-card" onSubmit={submit}>
        <div className="card-corner corner-a">DAY 13</div>
        <div className="card-corner corner-b">365</div>
        <div className="card-corner corner-c">AUTH</div>
        <div className="card-corner corner-d">ACCESS</div>
        <div className="auth-card-head">
          <p>HALL OF FAME</p>
          <h1 id="auth-title">{mode === "login" ? "登录" : "注册"}</h1>
        </div>
        <div className={mode === "register" ? "segmented-control is-register" : "segmented-control"} aria-label="认证模式">
          <button type="button" className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")}>
            <KeyRound size={16} />
            <span>登录</span>
          </button>
          <button type="button" className={mode === "register" ? "is-active" : ""} onClick={() => setMode("register")}>
            <UserPlus size={16} />
            <span>注册</span>
          </button>
        </div>
        <label className="field">
          <span>邮箱</span>
          <span className="input-shell">
            <Mail size={17} />
            <input autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </span>
        </label>
        <div className={mode === "register" ? "auth-extra-field is-open" : "auth-extra-field"} aria-hidden={mode !== "register"}>
          <div className="auth-extra-field-inner">
            <label className="field">
              <span>昵称</span>
              <span className="input-shell">
                <User size={17} />
                <input
                  autoComplete="nickname"
                  disabled={mode !== "register"}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                />
              </span>
            </label>
          </div>
        </div>
        <label className="field">
          <span>密码</span>
          <span className="input-shell">
            <Lock size={17} />
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </span>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-action" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? "连接中" : submitLabel}</span>
          <ChevronRight size={18} />
        </button>
      </form>
    </section>
  );
}

interface ArchivePageProps {
  people: QuotePerson[];
  loading: boolean;
  canManageFeatured: boolean;
  featuredQuoteIds: string[];
  onToggleFeaturedQuote: (quoteId: string) => void;
}

function ArchivePage({
  people,
  loading,
  canManageFeatured,
  featuredQuoteIds,
  onToggleFeaturedQuote,
}: ArchivePageProps) {
  const [selectedId, setSelectedId] = useState(people[0]?.id ?? "");
  const [selectedFeatured, setSelectedFeatured] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  // API-driven pagination state
  const [quotePage, setQuotePage] = useState(1);
  const [quoteRows, setQuoteRows] = useState<Quote[]>([]);
  const [quoteTotal, setQuoteTotal] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const QUOTE_PAGE_SIZE = 10;

  const handleViewDetail = useCallback((quote: Quote) => {
    setDetailQuote((current) => (current?.qid === quote.qid ? null : quote));
  }, []);

  const handleCloseImageModal = useCallback(() => {
    setImageModalUrl(null);
  }, []);

  useEffect(() => {
    if (!people.some((person) => person.id === selectedId)) {
      setSelectedId(people[0]?.id ?? "");
    }

    if (previewId && !people.some((person) => person.id === previewId)) {
      setPreviewId(null);
    }
  }, [people, previewId, selectedId]);

  // Reset pagination and close overlay when selection changes
  useEffect(() => {
    setQuotePage(1);
    setQuoteRows([]);
    setQuoteTotal(0);
    setHistoryOpen(false);
    setDetailQuote(null);
  }, [selectedId, selectedFeatured]);

  // Fetch quotes from API whenever selection or page changes
  const selected = useMemo(
    () => people.find((person) => person.id === selectedId) ?? people[0] ?? null,
    [people, selectedId],
  );

  useEffect(() => {
    if (!selected && !selectedFeatured) return;

    let active = true;
    setQuoteLoading(true);

    async function fetchQuotes() {
      try {
        let result;
        if (selectedFeatured) {
          result = await api.featuredQuotes(quotePage, QUOTE_PAGE_SIZE);
        } else if (selected) {
          result = await api.speakerQuotes(selected.qqnumber, quotePage, QUOTE_PAGE_SIZE);
        } else {
          return;
        }
        if (!active) return;
        setQuoteRows(result.items);
        setQuoteTotal(result.total);
      } catch {
        // keep existing rows on error
      } finally {
        if (active) setQuoteLoading(false);
      }
    }

    void fetchQuotes();
    return () => { active = false; };
  }, [selected, selectedFeatured, quotePage]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current !== null) {
        window.clearTimeout(previewTimerRef.current);
      }
    };
  }, []);

  function clearPackPreviewTimer() {
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }

  function queuePackPreview(personId: string) {
    if (window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    clearPackPreviewTimer();
    previewTimerRef.current = window.setTimeout(() => {
      setPreviewId(personId);
      previewTimerRef.current = null;
    }, PACK_PREVIEW_DELAY_MS);
  }

  function clearPackPreview() {
    clearPackPreviewTimer();
    setPreviewId(null);
  }

  function selectPerson(personId: string) {
    clearPackPreview();
    setSelectedId(personId);
    setSelectedFeatured(false);
  }

  function selectFeatured() {
    clearPackPreview();
    if (selectedFeatured) {
      setSelectedFeatured(false);
      setSelectedId("");
    } else {
      setSelectedFeatured(true);
      setSelectedId("");
    }
  }

  function handlePackBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      clearPackPreview();
    }
  }

  const quotePageCount = getPageCount(quoteTotal, QUOTE_PAGE_SIZE);

  if (!people.length) {
    return (
      <section className="archive-page" aria-labelledby="archive-title">
        <div className="empty-state">暂无档案数据</div>
      </section>
    );
  }

  return (
    <section className="archive-page" aria-labelledby="archive-title">
      <div className="page-label">
        <span>USER QUOTES</span>
        <strong>{String(people.length).padStart(2, "0")}</strong>
      </div>
      <div className="archive-shell">
        <aside className="pack-menu" aria-label="用户卡包">
          <div className="pack-title">
            <span id="archive-title">CARD PACK</span>
            <Sparkles size={17} />
          </div>
          <div
            className="pack-list"
            onFocusCapture={() => setPreviewId(people[0]?.id ?? null)}
            onBlurCapture={handlePackBlur}
          >
            <button
              type="button"
              className={["pack-card", "is-featured-card", selectedFeatured ? "is-selected" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={selectFeatured}
            >
              <div className="pack-card-body">
                <strong>精华</strong>
                <div className="pack-card-meta">
                  <small>精选合集</small>
                </div>
              </div>
            </button>
            {people.map((person) => (
              <button
                type="button"
                key={person.id}
                className={[
                  "pack-card",
                  !selectedFeatured && person.id === selectedId ? "is-selected" : "",
                  previewId === person.id && person.id !== selectedId ? "is-previewed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onPointerEnter={() => queuePackPreview(person.id)}
                onFocus={() => setPreviewId(person.id)}
                onBlur={clearPackPreview}
                onClick={() => selectPerson(person.id)}
              >
                <div className="pack-card-body">
                  <strong>{person.name}</strong>
                  <div className="pack-card-meta">
                    <small>QQ: {person.qqnumber}</small>
                    <small>{person.quoteCount} 条发言</small>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>
        <article className="quote-card" aria-busy={loading || quoteLoading}>
          <section className="quote-card-section portrait-section">
            <div className="person-meta">
              <span className="person-kicker">{selectedFeatured ? "FEATURED COLLECTION" : selected?.signal ?? ""}</span>
              <h2 className="nickname-box">{selectedFeatured ? "精华合集" : (selected?.name ?? "")}</h2>
              <p className="person-role">{selectedFeatured ? "被管理员标记的精选言论" : (selected?.role ?? "")}</p>
              <div className="person-stats">
                <span className="badge">QQ: {selectedFeatured ? "MULTI" : (selected?.qqnumber ?? "—")}</span>
                <span className="badge">{quoteTotal} 条发言</span>
                <span className="badge">{selectedFeatured ? "FEATURED" : (selected?.qqGroup ?? "—")}</span>
              </div>
            </div>
          </section>
          <section className="quote-card-section history-section">
            <div className="history-table-header">
              <span>发言人</span>
              <span>QQ群</span>
              <span>言论</span>
            </div>
            <HistoryRows
              rows={quoteRows}
              canManageFeatured={canManageFeatured}
              featuredQuoteIds={featuredQuoteIds}
              onToggleFeaturedQuote={onToggleFeaturedQuote}
              onViewDetail={handleViewDetail}
              activeDetailQid={detailQuote?.qid ?? null}
            />
            {quotePageCount > 1 && (
              <Pagination
                page={quotePage - 1}
                pageCount={quotePageCount}
                onPageChange={(p) => setQuotePage(p + 1)}
                compactLabel={`${quotePage}/${quotePageCount}`}
              />
            )}
          </section>
          {historyOpen && (
            <section className="history-overlay" aria-labelledby="history-overlay-title">
              <div className="history-overlay-head">
                <div>
                  <span>{quoteTotal} ROWS</span>
                  <h2 id="history-overlay-title">EXPLORE HISTORY</h2>
                </div>
                <button type="button" onClick={() => setHistoryOpen(false)} aria-label="关闭历史">
                  <X size={18} />
                </button>
              </div>
              <div className="history-table-header">
                <span>发言人</span>
                <span>QQ群</span>
                <span>言论</span>
              </div>
              <HistoryRows
                rows={quoteRows}
                canManageFeatured={canManageFeatured}
                featuredQuoteIds={featuredQuoteIds}
                onToggleFeaturedQuote={onToggleFeaturedQuote}
                onViewDetail={handleViewDetail}
                activeDetailQid={detailQuote?.qid ?? null}
              />
              <Pagination
                page={quotePage - 1}
                pageCount={quotePageCount}
                onPageChange={(p) => setQuotePage(p + 1)}
                compactLabel={`${quotePage}/${quotePageCount}`}
              />
            </section>
          )}
        </article>
        <div className="detail-panel" aria-label="言论详情">
          {detailQuote ? (
            <>
              <div className="detail-panel-header">DETAIL</div>
              <div className="detail-panel-body">
                <table className="detail-table">
                  <tbody>
                    <tr>
                      <td className="detail-table-label">QQ</td>
                      <td>{detailQuote.userdata?.qqnumber}</td>
                    </tr>
                    <tr>
                      <td className="detail-table-label">昵称</td>
                      <td>{detailQuote.userdata?.speaker}</td>
                    </tr>
                    <tr>
                      <td className="detail-table-label">群号</td>
                      <td>{detailQuote.groupdata?.groupnumber}</td>
                    </tr>
                    <tr>
                      <td className="detail-table-label">群名</td>
                      <td>{detailQuote.groupdata?.groupname || "—"}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="detail-field">
                  <span className="detail-field-title">抑郁度</span>
                  <div className="detail-suppression-bar-segmented">
                    <div className="detail-suppression-segment" style={{ opacity: detailQuote.suppression >= 20 ? 0.4 : 0.12 }} />
                    <div className="detail-suppression-segment" style={{ opacity: detailQuote.suppression >= 45 ? 0.6 : 0.12 }} />
                    <div className="detail-suppression-segment" style={{ opacity: detailQuote.suppression >= 70 ? 0.8 : 0.12 }} />
                    <div className="detail-suppression-segment" style={{ opacity: detailQuote.suppression >= 95 ? 1 : 0.12 }} />
                  </div>
                  <span className="detail-suppression-label">{detailQuote.suppression}%</span>
                </div>
                {detailQuote.content ? (
                  <div className="detail-field">
                    <span className="detail-field-title">内容</span>
                    <p className="detail-content">{detailQuote.content}</p>
                  </div>
                ) : null}
                {detailQuote.ai_comment ? (
                  <div className="detail-field">
                    <span className="detail-field-title">AI 评论</span>
                    <div className="detail-panel-ai">
                      <p>{detailQuote.ai_comment}</p>
                    </div>
                  </div>
                ) : null}
                {detailQuote.attachmentid?.length > 0 ? (
                  <div className="detail-field">
                    <span className="detail-field-title">附件</span>
                    <div className="detail-thumbnails">
                      {detailQuote.attachmentid.map((attId) => (
                        <button
                          key={attId}
                          type="button"
                          className="detail-thumb"
                          onClick={() => setImageModalUrl(api.getQuoteAttachment(detailQuote.qid, attId))}
                        >
                          <img
                            src={api.getQuoteAttachment(detailQuote.qid, attId)}
                            alt={`附件 ${attId}`}
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="detail-empty">未选择任何言论</div>
          )}
        </div>
      </div>
      {imageModalUrl && (
        <div className="image-modal" role="dialog" aria-modal="true" onClick={handleCloseImageModal}>
          <button
            className="image-modal-close"
            type="button"
            onClick={handleCloseImageModal}
            aria-label="关闭图片"
          >
            <X size={24} />
          </button>
          <img
            className="image-modal-content"
            src={imageModalUrl}
            alt="附件大图"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

interface HistoryRowsProps {
  rows: Quote[];
  canManageFeatured: boolean;
  featuredQuoteIds: string[];
  onToggleFeaturedQuote: (quoteId: string) => void;
  onViewDetail: (quote: Quote) => void;
  activeDetailQid: string | null;
}

function HistoryRows({ rows, canManageFeatured, featuredQuoteIds, onToggleFeaturedQuote, onViewDetail, activeDetailQid }: HistoryRowsProps) {
  if (!rows.length) {
    return <div className="empty-state">暂无历史言论</div>;
  }

  return (
    <div className="history-list" tabIndex={0} aria-label="历史金句">
      {rows.map((item) => {
        const isFeatured = featuredQuoteIds.includes(item.qid);
        const limitReached = false;

        return (
          <div className={canManageFeatured ? "history-row history-row-manage" : "history-row"} key={item.qid}>
            <span className="speaker">{item.userdata?.speaker}</span>
            <span className="group">{item.groupdata?.groupnumber}</span>
            <p className="history-row-content">{item.is_featured ? "★ " : ""}{item.content}</p>
            <div className="history-row-actions">
              <button
                className={activeDetailQid === item.qid ? "detail-toggle is-active" : "detail-toggle"}
                type="button"
                aria-label="查看详情"
                onClick={() => onViewDetail(item)}
              >
                <Eye size={14} />
              </button>
              {canManageFeatured && (
                <button
                  className={isFeatured ? "feature-toggle is-on" : "feature-toggle"}
                  type="button"
                  disabled={limitReached}
                  aria-pressed={isFeatured}
                  aria-label={isFeatured ? "取消精华" : "设为精华"}
                  onClick={() => onToggleFeaturedQuote(item.qid)}
                >
                  <Star size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MarkdownContent({ value }: { value: string }) {
  const lines = value.split(/\r?\n/);

  return (
    <div className="markdown-content">
      {lines.map((line, index) => {
        if (line.startsWith("### ")) {
          return <h4 key={`${line}-${index}`}>{line.slice(4)}</h4>;
        }
        if (line.startsWith("## ")) {
          return <h3 key={`${line}-${index}`}>{line.slice(3)}</h3>;
        }
        if (line.startsWith("# ")) {
          return <h2 key={`${line}-${index}`}>{line.slice(2)}</h2>;
        }
        if (line.startsWith("- ")) {
          return <li key={`${line}-${index}`}>{line.slice(2)}</li>;
        }
        return <p key={`${line}-${index}`}>{line || "\u00a0"}</p>;
      })}
    </div>
  );
}

interface AdminDashboardProps {
  profile: Profile | null;
  quotes: Quote[];
  users: AdminUser[];
  logs: LoginLog[];
  loading: boolean;
  featuredQuoteIds: string[];
  userPage: number;
  userTotal: number;
  onUserPageChange: (page: number) => void;
  onToggleFeaturedQuote: (quoteId: string) => void;
  onDeleteQuote: (quoteId: string) => void;
  onUserChange: (userId: string, patch: Partial<AdminUser>) => void;
}

function AdminDashboard({
  profile,
  quotes,
  users,
  logs,
  loading,
  featuredQuoteIds,
  userPage,
  userTotal,
  onUserPageChange,
  onToggleFeaturedQuote,
  onDeleteQuote,
  onUserChange,
}: AdminDashboardProps) {
  const [adminTab, setAdminTab] = useState(0);
  const [quoteQuery, setQuoteQuery] = useState("");
  const [quotePage, setQuotePage] = useState(0);
  const canManageQuotes = profile?.role === "admin";

  // Create quote modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createContent, setCreateContent] = useState("");
  const [createQqnumber, setCreateQqnumber] = useState("");
  const [createSpeaker, setCreateSpeaker] = useState("");
  const [createGroupnumber, setCreateGroupnumber] = useState("");
  const [createGroupname, setCreateGroupname] = useState("");
  const [createSuppression, setCreateSuppression] = useState(0);
  const [createFiles, setCreateFiles] = useState<FileList | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  // Detail modal state
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);

  // Speaker management state
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [speakerPage, setSpeakerPage] = useState(0);
  const [speakerTotal, setSpeakerTotal] = useState(0);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const SPEAKER_PAGE_SIZE = 50;

  const filteredQuotes = useMemo(() => {
    const query = quoteQuery.trim().toLowerCase();
    if (!query) {
      return quotes;
    }
    return quotes.filter(
      (quote) => quote.qid.toLowerCase().includes(query) || quote.userdata.speaker.toLowerCase().includes(query),
    );
  }, [quoteQuery, quotes]);
  const quotePageCount = getPageCount(filteredQuotes.length, ADMIN_QUOTE_PAGE_SIZE);
  const safeQuotePage = Math.min(quotePage, quotePageCount - 1);
  const pagedQuotes = filteredQuotes.slice(
    safeQuotePage * ADMIN_QUOTE_PAGE_SIZE,
    (safeQuotePage + 1) * ADMIN_QUOTE_PAGE_SIZE,
  );

  useEffect(() => {
    setQuotePage(0);
  }, [quoteQuery]);

  // Load speakers when tab changes to speakers
  useEffect(() => {
    if (adminTab !== 2) {
      return;
    }

    let isActive = true;

    async function loadSpeakers() {
      try {
        const result = await api.listSpeakers(speakerPage + 1, SPEAKER_PAGE_SIZE);
        if (!isActive) {
          return;
        }
        setSpeakers(result.items);
        setSpeakerTotal(result.total);
      } catch {
        // Keep empty state
      }
    }

    void loadSpeakers();

    return () => {
      isActive = false;
    };
  }, [adminTab, speakerPage]);

  async function handleCreateQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");

    if (!createContent.trim()) {
      setCreateError("内容不能为空");
      return;
    }

    if (!createQqnumber.trim() || !createSpeaker.trim()) {
      setCreateError("QQ号和昵称不能为空");
      return;
    }

    setCreateSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("content", createContent);
      formData.append("userdata", JSON.stringify({
        qqnumber: createQqnumber,
        speaker: createSpeaker,
      }));
      formData.append("groupdata", JSON.stringify({
        groupnumber: createGroupnumber,
        groupname: createGroupname,
      }));
      formData.append("suppression", String(createSuppression));
      if (createFiles) {
        for (let i = 0; i < createFiles.length; i++) {
          formData.append("files", createFiles[i]);
        }
      }
      await api.createQuote(formData);
      setShowCreateModal(false);
      resetCreateForm();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreateSubmitting(false);
    }
  }

  function resetCreateForm() {
    setCreateContent("");
    setCreateQqnumber("");
    setCreateSpeaker("");
    setCreateGroupnumber("");
    setCreateGroupname("");
    setCreateSuppression(0);
    setCreateFiles(null);
    setCreateError("");
  }

  async function handleDeleteSpeaker(qqNumber: string) {
    try {
      await api.deleteSpeaker(qqNumber);
      setSpeakers((prev) => prev.filter((s) => s.qqnumber !== qqNumber));
    } catch {
      // Deletion failed
    }
  }

  
  return (
    <section className="admin-page" aria-labelledby="admin-title">
      <div className="admin-head">
        <div>
          <p>ADMIN DASHBOARD</p>
          <h1 id="admin-title">控制台</h1>
        </div>
        <div className="admin-status">
          <Shield size={18} />
          <span>{canManageQuotes ? "ADMIN VERIFIED" : "PREVIEW MODE"}</span>
        </div>
      </div>

      <div className="admin-layout" aria-busy={loading}>
        <div className="admin-sidebar" role="tablist" aria-label="管理面板">
          <button
            type="button"
            role="tab"
            aria-selected={adminTab === 0}
            className={adminTab === 0 ? "admin-sidebar-item is-active" : "admin-sidebar-item"}
            onClick={() => setAdminTab(0)}
          >
            <Archive size={18} />
            <span>言论库</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={adminTab === 1}
            className={adminTab === 1 ? "admin-sidebar-item is-active" : "admin-sidebar-item"}
            onClick={() => setAdminTab(1)}
          >
            <User size={18} />
            <span>用户列表</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={adminTab === 2}
            className={adminTab === 2 ? "admin-sidebar-item is-active" : "admin-sidebar-item"}
            onClick={() => setAdminTab(2)}
          >
            <Users size={18} />
            <span>发言人管理</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={adminTab === 3}
            className={adminTab === 3 ? "admin-sidebar-item is-active" : "admin-sidebar-item"}
            onClick={() => setAdminTab(3)}
          >
            <FileText size={18} />
            <span>登录日志</span>
          </button>
        </div>

        <div className="admin-content">
          {/* Tab 0: Quote Library */}
          {adminTab === 0 && (
            <section className="panel table-panel quote-table-panel">
              <div className="panel-title-row">
                <PanelTitle icon={Archive} title="言论库" action="SYNC" />
                <button
                  type="button"
                  className="primary-action create-quote-btn"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} />
                  <span>手动创建言论</span>
                </button>
              </div>
              <div className="admin-table-tools">
                <label className="admin-search">
                  <Search size={15} />
                  <input
                    value={quoteQuery}
                    placeholder="Search speaker / q-id"
                    onChange={(event) => setQuoteQuery(event.target.value)}
                  />
                </label>
                <span>{filteredQuotes.length} ROWS</span>
              </div>
              <div className="brutal-table paged-table">
                <div className="table-row table-head admin-quote-row">
                  <span>ID</span>
                  <span>Speaker</span>
                  <span>Quote</span>
                  <span>Ops</span>
                </div>
                {pagedQuotes.map((quote) => (
                  <div className="table-row admin-quote-row" key={quote.qid}>
                    <span>{quote.qid}</span>
                    <span>{quote.userdata.speaker}</span>
                    <p>{quote.content}</p>
                    <div className="switch-cluster">
                      <button
                        type="button"
                        aria-label="查看详情"
                        onClick={() => setDetailQuote(quote)}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className={featuredQuoteIds.includes(quote.qid) ? "is-featured" : ""}
                        type="button"
                        disabled={!canManageQuotes}
                        aria-label="切换精华"
                        onClick={() => onToggleFeaturedQuote(quote.qid)}
                      >
                        <Star size={14} />
                      </button>
                      <button type="button" disabled={!canManageQuotes} aria-label="删除言论" onClick={() => onDeleteQuote(quote.qid)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination page={safeQuotePage} pageCount={quotePageCount} onPageChange={setQuotePage} />
            </section>
          )}

          {/* Tab 1: User List */}
          {adminTab === 1 && (
            <section className="panel table-panel user-table-panel">
              <PanelTitle icon={User} title="用户列表" action="ACL" />
              <div className="brutal-table user-table editable-user-table">
                <div className="table-row table-head">
                  <span>User</span>
                  <span>Role</span>
                </div>
                {users.map((user) => (
                  <div className="table-row" key={user.uid}>
                    <span>{user.nickname}</span>
                    <select
                      value={user.role}
                      aria-label={`${user.nickname} role`}
                      onChange={(event) => onUserChange(user.uid, { role: event.target.value as AdminUser["role"] })}
                    >
                      <option value="admin">admin</option>
                      <option value="user">user</option>
                      <option value="banned">banned</option>
                    </select>
                  </div>
                ))}
              </div>
              <Pagination page={userPage} pageCount={getPageCount(userTotal, 4)} onPageChange={onUserPageChange} />
            </section>
          )}

          {/* Tab 2: Speaker Management */}
          {adminTab === 2 && (
            <section className="panel table-panel speaker-manage-panel">
              <PanelTitle icon={Users} title="发言人管理" action="LIST" />
              <div className="brutal-table speaker-manage-table">
                <div className="table-row table-head speaker-manage-head">
                  <span>QQ 号</span>
                  <span>昵称</span>
                  <span>头像</span>
                  <span>言论数</span>
                  <span>操作</span>
                </div>
                {speakers.length === 0 && (
                  <div className="empty-state">暂无发言人数据</div>
                )}
                {speakers.map((speaker) => (
                  <div
                    className="table-row speaker-manage-row"
                    key={speaker.qqnumber}
                    onClick={() => setSelectedSpeaker(speaker)}
                  >
                    <span>{speaker.qqnumber}</span>
                    <span>{speaker.speaker}</span>
                    <span className="speaker-avatar-cell">
                      {speaker.avatar ? (
                        <img
                          className="speaker-avatar"
                          src={speaker.avatar}
                          alt={speaker.speaker}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <span className="speaker-avatar-placeholder">—</span>
                      )}
                    </span>
                    <span>{speaker.quote_count}</span>
                    <span>
                      <button
                        type="button"
                        className="speaker-delete-btn"
                        aria-label={`删除发言人 ${speaker.speaker}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSpeaker(speaker.qqnumber);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
              <Pagination page={speakerPage} pageCount={getPageCount(speakerTotal, SPEAKER_PAGE_SIZE)} onPageChange={setSpeakerPage} />
            </section>
          )}

          {/* Tab 3: Login Logs */}
          {adminTab === 3 && (
            <section className="panel terminal-panel">
              <PanelTitle icon={Terminal} title="登录日志" action="LIVE" />
              <PageVirtualList
                items={logs}
                rowHeight={ADMIN_LOG_ROW_HEIGHT}
                className="terminal-window virtual-list terminal-virtual-list"
                rowClassName="terminal-line virtual-list-row"
                maxVisibleRows={ADMIN_LOG_MAX_VISIBLE_ROWS}
                getKey={(log) => log.id}
                renderRow={(log) => (
                  <p className={log.result === "failed" ? "is-failed" : ""}>
                    <span>{log.at}</span> auth:{log.result} user={log.email} ip={log.ip}
                  </p>
                )}
              />
            </section>
          )}
        </div>
      </div>

      {/* Create Quote Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-quote-title">
          <div className="modal-panel create-quote-modal">
            <div className="modal-head">
              <h2 id="create-quote-title">手动创建言论</h2>
              <button type="button" onClick={() => { setShowCreateModal(false); resetCreateForm(); }} aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <form className="create-quote-form" onSubmit={handleCreateQuote}>
              <label className="modal-field">
                <span>内容 *</span>
                <textarea
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  required
                  rows={4}
                />
              </label>
              <label className="modal-field">
                <span>QQ号 *</span>
                <input
                  type="text"
                  value={createQqnumber}
                  onChange={(e) => setCreateQqnumber(e.target.value)}
                  required
                  placeholder="请输入QQ号"
                />
              </label>
              <label className="modal-field">
                <span>昵称 *</span>
                <input
                  type="text"
                  value={createSpeaker}
                  onChange={(e) => setCreateSpeaker(e.target.value)}
                  required
                  placeholder="请输入昵称"
                />
              </label>
              <label className="modal-field">
                <span>群号</span>
                <input
                  type="text"
                  value={createGroupnumber}
                  onChange={(e) => setCreateGroupnumber(e.target.value)}
                  placeholder="请输入群号"
                />
              </label>
              <label className="modal-field">
                <span>群名</span>
                <input
                  type="text"
                  value={createGroupname}
                  onChange={(e) => setCreateGroupname(e.target.value)}
                  placeholder="请输入群名"
                />
              </label>
              <label className="modal-field">
                <span>Suppression</span>
                <input
                  type="number"
                  value={createSuppression}
                  onChange={(e) => setCreateSuppression(Number(e.target.value))}
                  min={0}
                />
              </label>
              <label className="modal-field">
                <span>文件</span>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setCreateFiles(e.target.files)}
                  className="global-file-input"
                />
              </label>
              {createError && <p className="form-error">{createError}</p>}
              <button className="primary-action" type="submit" disabled={createSubmitting}>
                <span>{createSubmitting ? "提交中..." : "提交"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quote Detail Modal */}
      {detailQuote && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="detail-quote-title">
          <div className="modal-panel detail-modal">
            <div className="modal-head">
              <h2 id="detail-quote-title">言论详情</h2>
              <button type="button" onClick={() => setDetailQuote(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="detail-modal-body">
              <table className="detail-table">
                <tbody>
                  <tr>
                    <td className="detail-table-label">QQ</td>
                    <td>{detailQuote.userdata?.qqnumber}</td>
                  </tr>
                  <tr>
                    <td className="detail-table-label">昵称</td>
                    <td>{detailQuote.userdata?.speaker}</td>
                  </tr>
                  <tr>
                    <td className="detail-table-label">群号</td>
                    <td>{detailQuote.groupdata?.groupnumber}</td>
                  </tr>
                  <tr>
                    <td className="detail-table-label">群名</td>
                    <td>{detailQuote.groupdata?.groupname || "—"}</td>
                  </tr>
                </tbody>
              </table>
              <div className="detail-field">
                <span className="detail-field-title">抑郁度</span>
                <div className="detail-suppression-bar-segmented">
                  <div className="detail-suppression-segment" style={{ opacity: detailQuote.suppression >= 20 ? 0.4 : 0.12 }} />
                  <div className="detail-suppression-segment" style={{ opacity: detailQuote.suppression >= 45 ? 0.6 : 0.12 }} />
                  <div className="detail-suppression-segment" style={{ opacity: detailQuote.suppression >= 70 ? 0.8 : 0.12 }} />
                  <div className="detail-suppression-segment" style={{ opacity: detailQuote.suppression >= 95 ? 1 : 0.12 }} />
                </div>
                <span className="detail-suppression-label">{detailQuote.suppression}%</span>
              </div>
              <div className="detail-field">
                <span className="detail-field-title">内容</span>
                <p className="detail-content">{detailQuote.content}</p>
              </div>
              {detailQuote.attachmentid?.length > 0 && (
                <div className="detail-field">
                  <span className="detail-field-title">附件</span>
                  <div className="detail-thumbnails">
                    {detailQuote.attachmentid.map((attId) => (
                      <img
                        key={attId}
                        className="detail-thumbnail"
                        src={api.getQuoteAttachment(detailQuote.qid, attId)}
                        alt={`附件 ${attId}`}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {detailQuote.created_at && (
                <div className="detail-field">
                  <span className="detail-field-title">创建时间</span>
                  <span>{detailQuote.created_at}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Speaker Detail Modal */}
      {selectedSpeaker && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="speaker-detail-title">
          <div className="modal-panel detail-modal">
            <div className="modal-head">
              <h2 id="speaker-detail-title">发言人详情</h2>
              <button type="button" onClick={() => setSelectedSpeaker(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="detail-modal-body">
              <div className="detail-section">
                <h3>QQ 号</h3>
                <span>{selectedSpeaker.qqnumber}</span>
              </div>
              <div className="detail-section">
                <h3>昵称</h3>
                <span>{selectedSpeaker.speaker}</span>
              </div>
              {selectedSpeaker.avatar && (
                <div className="detail-section">
                  <h3>头像</h3>
                  <img className="detail-avatar" src={selectedSpeaker.avatar} alt={selectedSpeaker.speaker} />
                </div>
              )}
              <div className="detail-section">
                <h3>言论数</h3>
                <span>{selectedSpeaker.quote_count}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

interface PaginationProps {
  page: number;
  pageCount: number;
  compactLabel?: string;
  onPageChange: (page: number) => void;
}

function Pagination({ page, pageCount, compactLabel, onPageChange }: PaginationProps) {
  return (
    <div className="pagination-controls">
      <button type="button" disabled={page <= 0} onClick={() => onPageChange(Math.max(0, page - 1))}>
        <ChevronLeft size={15} />
      </button>
      <span>{compactLabel ?? `PAGE ${page + 1} / ${pageCount}`}</span>
      <button type="button" disabled={page >= pageCount - 1} onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}>
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

interface SettingsPanelProps {
  appSettings: AppSettings;
  cursorSettings: CursorSettings;
  onAppSettingsChange: Dispatch<SetStateAction<AppSettings>>;
  onCursorSettingsChange: Dispatch<SetStateAction<CursorSettings>>;
  onClose: () => void;
}

function SettingsPanel({
  appSettings,
  cursorSettings,
  onAppSettingsChange,
  onCursorSettingsChange,
  onClose,
}: SettingsPanelProps) {
  const updateAppSetting = <Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) => {
    onAppSettingsChange((current) => normalizeAppSettings({ ...current, [key]: value }));
  };

  return (
    <div className="settings-backdrop" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <section className="settings-panel">
        <header className="settings-head">
          <div>
            <p>LOCAL PREFERENCES</p>
            <h2 id="settings-title">设置</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭设置">
            <X size={18} />
          </button>
        </header>
        <div className="settings-body">
          <section className="settings-section">
            <PanelTitle icon={Palette} title="背景" action="COLOR" />
            <ColorSetting
              id="app-background-color"
              label="背景颜色"
              value={appSettings.backgroundColor}
              onChange={(value) => updateAppSetting("backgroundColor", value)}
            />
          </section>
          <CursorSettingsPanel settings={cursorSettings} onChange={onCursorSettingsChange} />
        </div>
      </section>
    </div>
  );
}

interface CursorSettingsPanelProps {
  settings: CursorSettings;
  onChange: Dispatch<SetStateAction<CursorSettings>>;
}

function CursorSettingsPanel({ settings, onChange }: CursorSettingsPanelProps) {
  const updateSetting = <Key extends keyof CursorSettings>(key: Key, value: CursorSettings[Key]) => {
    onChange((current) => normalizeCursorSettings({ ...current, [key]: value }));
  };

  const resetSettings = () => {
    onChange(DEFAULT_CURSOR_SETTINGS);
  };

  return (
    <section className="settings-section cursor-settings-panel" aria-labelledby="cursor-settings-title">
      <PanelTitle
        icon={MousePointer2}
        title="光标自定义"
        action="RESET"
        titleId="cursor-settings-title"
        onAction={resetSettings}
      />
      <div className="cursor-settings-body">
        <button
          className={settings.enabled ? "cursor-delay-toggle is-on" : "cursor-delay-toggle"}
          type="button"
          aria-pressed={settings.enabled}
          onClick={() => updateSetting("enabled", !settings.enabled)}
        >
          <span>CUSTOM CURSOR</span>
          <i aria-hidden="true" />
        </button>
        <button
          className={settings.delayedFollow ? "cursor-delay-toggle is-on" : "cursor-delay-toggle"}
          type="button"
          aria-pressed={settings.delayedFollow}
          onClick={() => updateSetting("delayedFollow", !settings.delayedFollow)}
        >
          <span>DELAY FOLLOW</span>
          <i aria-hidden="true" />
        </button>
        <RangeSetting
          id="cursor-idle-size"
          label="NORMAL"
          value={settings.idleSize}
          min={CURSOR_SIZE_LIMITS.idleSize.min}
          max={CURSOR_SIZE_LIMITS.idleSize.max}
          onChange={(value) => updateSetting("idleSize", value)}
        />
        <RangeSetting
          id="cursor-interactive-size"
          label="HOVER"
          value={settings.interactiveSize}
          min={CURSOR_SIZE_LIMITS.interactiveSize.min}
          max={CURSOR_SIZE_LIMITS.interactiveSize.max}
          onChange={(value) => updateSetting("interactiveSize", value)}
        />
        <div className="cursor-color-grid">
          <ColorSetting
            id="cursor-color"
            label="光标颜色"
            value={settings.color}
            onChange={(value) => updateSetting("color", value)}
          />
          <ColorSetting
            id="cursor-mask-color"
            label="点击遮罩"
            value={settings.clickMaskColor}
            onChange={(value) => updateSetting("clickMaskColor", value)}
          />
        </div>
      </div>
    </section>
  );
}

interface RangeSettingProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function RangeSetting({ id, label, value, min, max, onChange }: RangeSettingProps) {
  return (
    <label className="cursor-range-setting" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--range-progress": `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      />
      <strong>{value}{max === 5 ? "" : "px"}</strong>
    </label>
  );
}

interface ColorSettingProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorSetting({ id, label, value, onChange }: ColorSettingProps) {
  return (
    <label className="cursor-color-setting" htmlFor={id}>
      <span>
        <Palette size={13} />
        {label}
      </span>
      <span className="cursor-color-picker">
        <i style={{ background: value }} aria-hidden="true" />
        <input id={id} type="color" value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

interface PanelTitleProps {
  icon: typeof Archive;
  title: string;
  action: string;
  titleId?: string;
  onAction?: () => void;
}

function PanelTitle({ icon: Icon, title, action, titleId, onAction }: PanelTitleProps) {
  return (
    <header className="panel-title">
      <div>
        <Icon size={18} />
        <h2 id={titleId}>{title}</h2>
      </div>
      <button type="button" onClick={onAction}>
        <RefreshCcw size={14} />
        <span>{action}</span>
      </button>
    </header>
  );
}

export default App;
