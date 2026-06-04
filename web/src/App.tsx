import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  ChevronRight,
  CircleDot,
  KeyRound,
  LayoutDashboard,
  Lock,
  Mail,
  Minimize2,
  MousePointer2,
  Palette,
  Plus,
  Power,
  Radar,
  RefreshCcw,
  Shield,
  Sparkles,
  Terminal,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { api, tokenStore } from "./api";
import { FluidShader } from "./components/FluidShader";
import { GeometricPortrait } from "./components/GeometricPortrait";
import type { AdminUser, AuthMode, GroupInfo, LoginLog, Profile, Quote, QuotePerson, View, WhitelistEntry } from "./types";

const views: Array<{ id: View; label: string; icon: typeof KeyRound }> = [
  { id: "auth", label: "AUTH", icon: KeyRound },
  { id: "archive", label: "ARCHIVE", icon: Archive },
  { id: "admin", label: "ADMIN", icon: LayoutDashboard },
];

const PACK_PREVIEW_DELAY_MS = 120;
const VIRTUAL_LIST_OVERSCAN = 6;
const ADMIN_TABLE_ROW_HEIGHT = 58;
const ADMIN_LOG_ROW_HEIGHT = 28;
const ADMIN_TABLE_MAX_VISIBLE_ROWS = 8;
const ADMIN_USER_MAX_VISIBLE_ROWS = 5;
const ADMIN_LOG_MAX_VISIBLE_ROWS = 10;
const CURSOR_SETTINGS_STORAGE_KEY = "hof.cursor-settings";
const DEFAULT_CURSOR_SETTINGS: CursorSettings = {
  idleSize: 32,
  interactiveSize: 24,
  color: "#e8ddc9",
  clickMaskColor: "#080808",
  delayedFollow: true,
};
const CURSOR_SIZE_LIMITS = {
  idleSize: { min: 18, max: 56 },
  interactiveSize: { min: 12, max: 44 },
};

interface CursorSettings {
  idleSize: number;
  interactiveSize: number;
  color: string;
  clickMaskColor: string;
  delayedFollow: boolean;
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

function loadCursorSettings() {
  try {
    const storedValue = window.localStorage.getItem(CURSOR_SETTINGS_STORAGE_KEY);
    return storedValue ? normalizeCursorSettings(JSON.parse(storedValue) as Partial<CursorSettings>) : DEFAULT_CURSOR_SETTINGS;
  } catch {
    return DEFAULT_CURSOR_SETTINGS;
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

interface PageVirtualListProps<Item> {
  items: Item[];
  rowHeight: number;
  className: string;
  rowClassName: string;
  maxVisibleRows: number;
  getKey: (item: Item, index: number) => React.Key;
  renderRow: (item: Item, index: number) => React.ReactNode;
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
      style={{ maxHeight: listMaxHeight, "--virtual-row-height": `${rowHeight}px` } as React.CSSProperties}
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
  const hashView = window.location.hash.replace("#", "") as View;
  if (views.some((item) => item.id === hashView)) {
    return hashView;
  }

  return tokenStore.read() ? "archive" : "auth";
}

const portraitTypes: QuotePerson["portrait"][] = ["circles", "slices", "halo", "mesh"];

function createPeopleFromQuotes(quotes: Quote[]): QuotePerson[] {
  if (!quotes.length) {
    return [];
  }

  const peopleBySpeaker = new Map<string, Quote[]>();
  quotes.forEach((quote) => {
    const key = quote.speaker || "群友匿名";
    peopleBySpeaker.set(key, [...(peopleBySpeaker.get(key) ?? []), quote]);
  });

  return Array.from(peopleBySpeaker.entries())
    .slice(0, 8)
    .map(([speaker, list], index) => {
      const sorted = [...list].sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)));
      return {
        id: `${speaker}-${index}`,
        name: speaker,
        qqGroup: sorted[0]?.qq_group ?? "UNKNOWN",
        role: index % 2 === 0 ? "群内高频发言人" : "档案收录对象",
        signal: `DAY ${String(13 + index * 2).padStart(2, "0")} / DISK ${String.fromCharCode(65 + index)}`,
        portrait: portraitTypes[index % portraitTypes.length],
        featuredQuote: sorted[0],
        history: sorted.slice(1, 8),
      };
    });
}

function App() {
  const [view, setView] = useState<View>(getInitialView);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Archive data
  const [people, setPeople] = useState<QuotePerson[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  // Admin data
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  const [cursorSettings, setCursorSettings] = useState<CursorSettings>(loadCursorSettings);
  const appShellRef = useRef<HTMLElement | null>(null);

  // Check auth on mount
  useEffect(() => {
    const tokens = tokenStore.read();
    if (!tokens) {
      setProfileLoading(false);
      setView("auth");
      return;
    }
    api.profile()
      .then((p) => {
        setProfile(p);
        setView("archive");
      })
      .catch(() => {
        tokenStore.clear();
        setView("auth");
      })
      .finally(() => setProfileLoading(false));
  }, []);

  // Load archive data when entering archive view
  useEffect(() => {
    if (view !== "archive" || !profile) return;
    let cancelled = false;
    setArchiveLoading(true);
    setArchiveError("");
    Promise.all([api.quotes(), api.groups()])
      .then(([q, g]) => {
        if (cancelled) return;
        setPeople(createPeopleFromQuotes(q));
        setGroups(g);
      })
      .catch((err) => {
        if (cancelled) return;
        setArchiveError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setArchiveLoading(false);
      });
    return () => { cancelled = true; };
  }, [view, profile]);

  // Load admin data when entering admin view
  useEffect(() => {
    if (view !== "admin" || !profile || (profile.role !== "admin" && profile.role !== "owner")) return;
    let cancelled = false;
    setAdminLoading(true);
    setAdminError("");
    Promise.all([
      api.quotes(),
      api.groups(),
      api.adminUsers(),
      api.loginLogs(),
      api.adminWhitelist(),
    ])
      .then(([q, g, u, l, w]) => {
        if (cancelled) return;
        setQuotes(q);
        setGroups(g);
        setAdminUsers(u);
        setLoginLogs(l);
        setWhitelist(w);
      })
      .catch((err) => {
        if (cancelled) return;
        setAdminError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setAdminLoading(false);
      });
    return () => { cancelled = true; };
  }, [view, profile]);

  useEffect(() => {
    const nextHash = `#${view}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
    appShellRef.current?.scrollTo({ left: 0, top: 0 });
    window.scrollTo({ left: 0, top: 0 });
  }, [view]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CURSOR_SETTINGS_STORAGE_KEY, JSON.stringify(cursorSettings));
    } catch {
      // Cursor preferences are cosmetic; storage failures should never block the dashboard.
    }
  }, [cursorSettings]);

  const handleAuthenticated = async (tokens: { access_token: string; refresh_token?: string }) => {
    tokenStore.write(tokens);
    try {
      const p = await api.profile();
      setProfile(p);
      setView("archive");
    } catch {
      tokenStore.clear();
      setView("auth");
    }
  };

  const handleSignOut = () => {
    tokenStore.clear();
    setProfile(null);
    setPeople([]);
    setQuotes([]);
    setGroups([]);
    setAdminUsers([]);
    setLoginLogs([]);
    setWhitelist([]);
    setView("auth");
  };

  const refreshAdmin = useCallback(async () => {
    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) return;
    setAdminError("");
    try {
      const [q, g, u, l, w] = await Promise.all([
        api.quotes(),
        api.groups(),
        api.adminUsers(),
        api.loginLogs(),
        api.adminWhitelist(),
      ]);
      setQuotes(q);
      setGroups(g);
      setAdminUsers(u);
      setLoginLogs(l);
      setWhitelist(w);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "刷新失败");
    }
  }, [profile]);

  if (profileLoading) {
    return (
      <main className="app app-auth">
        <AcidGeometry />
        <div className="auth-page">
          <FluidShader />
          <div className="auth-card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p>连接中...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <CustomCursor settings={cursorSettings} />
      <main ref={appShellRef} className={`app app-${view}`}>
        <AcidGeometry />
        <TopNav currentView={view} onChange={setView} profile={profile} onSignOut={handleSignOut} />
        {view === "auth" && <AuthPage onAuthenticated={handleAuthenticated} />}
        {view === "archive" && (
          <ArchivePage people={people} loading={archiveLoading} error={archiveError} />
        )}
        {view === "admin" && (
          <AdminDashboard
            profile={profile}
            quotes={quotes}
            groups={groups}
            users={adminUsers}
            whitelist={whitelist}
            logs={loginLogs}
            loading={adminLoading}
            error={adminError}
            cursorSettings={cursorSettings}
            onCursorSettingsChange={setCursorSettings}
            onRefresh={refreshAdmin}
            onDeleteQuote={async (id) => { await api.deleteQuote(id); refreshAdmin(); }}
            onToggleFeatured={async (id, featured) => { await api.toggleFeatured(id, featured); refreshAdmin(); }}
            onUpdateRole={async (id, role) => { await api.adminUpdateRole(id, role); refreshAdmin(); }}
            onWhitelistAdd={async (email) => { await api.adminWhitelistAdd(email); refreshAdmin(); }}
            onWhitelistRemove={async (id) => { await api.adminWhitelistRemove(id); refreshAdmin(); }}
          />
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
    if (!finePointer.matches || !cursor) {
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
  }, [settings.delayedFollow]);

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
        } as React.CSSProperties
      }
      aria-hidden="true"
    />
  );
}

interface TopNavProps {
  currentView: View;
  profile: Profile | null;
  onChange: (view: View) => void;
  onSignOut: () => void;
}

function TopNav({ currentView, profile, onChange, onSignOut }: TopNavProps) {
  const isAdmin = profile?.role === "admin" || profile?.role === "owner";
  const visibleViews = isAdmin
    ? views
    : views.filter((v) => v.id !== "admin");

  return (
    <nav className="top-nav" aria-label="主导航">
      <button className="brand-mark" type="button" onClick={() => onChange("archive")} aria-label="返回档案页">
        <CircleDot size={18} />
        <span>HOF</span>
      </button>
      <div className="nav-switcher" role="tablist" aria-label="页面">
        {visibleViews.map(({ id, label, icon: Icon }) => (
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
      <button className="profile-chip" type="button" onClick={onSignOut} aria-label="退出登录">
        <Power size={15} />
        <span>{profile?.nickname ?? "PREVIEW"}</span>
      </button>
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
  onAuthenticated: (tokens: { access_token: string; refresh_token?: string }) => void;
}

function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = mode === "login" ? "进入档案" : "创建席位";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("请输入有效邮箱。");
      return;
    }

    if (password.length < 6) {
      setError("密码至少 6 位。");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "login") {
        const tokens = await api.login(email, password);
        onAuthenticated(tokens);
      } else {
        await api.register(email, password, nickname || email);
        const tokens = await api.login(email, password);
        onAuthenticated(tokens);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败，请稍后重试。");
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
            <input
              autoComplete="email"
              placeholder="your@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
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
                  placeholder="你的昵称"
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
              placeholder="至少 6 位密码"
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
  error: string;
}

function ArchivePage({ people, loading, error }: ArchivePageProps) {
  const [selectedId, setSelectedId] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPackOpen, setIsPackOpen] = useState(false);
  const [isQuoteFitLocked, setIsQuoteFitLocked] = useState(false);
  const [isQuoteFitPreview, setIsQuoteFitPreview] = useState(false);
  const previewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!people.some((person) => person.id === selectedId)) {
      setSelectedId(people[0]?.id ?? "");
    }

    if (previewId && !people.some((person) => person.id === previewId)) {
      setPreviewId(null);
    }
  }, [people, previewId, selectedId]);

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
  }

  function closePack() {
    clearPackPreview();
    setIsPackOpen(false);
  }

  function handlePackBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      closePack();
    }
  }

  const selected = useMemo(
    () => people.find((person) => person.id === selectedId) ?? null,
    [people, selectedId],
  );
  const isQuoteFit = isQuoteFitLocked || isQuoteFitPreview;

  if (loading || error) {
    return (
      <section className="archive-page">
        <div className="page-label">
          <span>USER QUOTES</span>
          <strong>--</strong>
        </div>
        <div className="archive-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <article className="quote-card" aria-busy={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p>{loading ? "加载中..." : error}</p>
          </article>
        </div>
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
            className={isPackOpen ? "pack-list is-expanded" : "pack-list"}
            onPointerEnter={(event) => {
              if (event.pointerType !== "touch") {
                setIsPackOpen(true);
              }
            }}
            onPointerLeave={closePack}
            onFocusCapture={() => setIsPackOpen(true)}
            onBlurCapture={handlePackBlur}
          >
            {people.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>暂无数据，请先通过 Bot 录入言论。</div>
            ) : (
              people.map((person, index) => (
                <button
                  type="button"
                  key={person.id}
                  className={[
                    "pack-card",
                    selected && person.id === selected.id ? "is-selected" : "",
                    previewId === person.id && selected && person.id !== selected.id ? "is-previewed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ "--stack-index": index } as React.CSSProperties}
                  onPointerEnter={() => queuePackPreview(person.id)}
                  onFocus={() => setPreviewId(person.id)}
                  onBlur={clearPackPreview}
                  onClick={() => selectPerson(person.id)}
                >
                  <span>{person.signal}</span>
                  <strong>{person.name}</strong>
                  <small>{person.qqGroup}</small>
                </button>
              ))
            )}
          </div>
        </aside>
        {selected ? (
          <article className="quote-card">
            <section className="quote-card-section portrait-section">
              <GeometricPortrait person={selected} />
              <div className="person-meta">
                <p>{selected.signal}</p>
                <h2>{selected.name}</h2>
                <span>{selected.role}</span>
              </div>
            </section>
            <section className={isQuoteFit ? "quote-card-section today-section is-fit" : "quote-card-section today-section"}>
              <div className="section-index">QUOTE OF THE DAY</div>
              <blockquote>{selected.featuredQuote.content}</blockquote>
              <cite>{selected.featuredQuote.speaker}</cite>
              <button
                className={isQuoteFitLocked ? "quote-fit-toggle is-locked" : "quote-fit-toggle"}
                type="button"
                aria-pressed={isQuoteFitLocked}
                aria-label={isQuoteFitLocked ? "恢复海报字号" : "完整展示今日金句"}
                title={isQuoteFitLocked ? "恢复海报字号" : "完整展示今日金句"}
                onMouseEnter={() => setIsQuoteFitPreview(true)}
                onMouseLeave={() => setIsQuoteFitPreview(false)}
                onFocus={() => setIsQuoteFitPreview(true)}
                onBlur={() => setIsQuoteFitPreview(false)}
                onClick={() => setIsQuoteFitLocked((locked) => !locked)}
              >
                <Minimize2 size={15} />
              </button>
            </section>
            <section className="quote-card-section history-section">
              <div className="history-head">
                <span>EXPLORE HISTORY</span>
                <span>{selected.history.length} ROWS</span>
              </div>
              <div className="history-list" tabIndex={0} aria-label={`${selected.name} 历史金句`}>
                {selected.history.length ? (
                  selected.history.map((item) => (
                    <div className="history-row" key={item.id}>
                      <time>{formatDate(item.created_at)}</time>
                      <p>{item.content}</p>
                      <span>{item.qq_group}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">暂无历史言论</div>
                )}
              </div>
            </section>
          </article>
        ) : (
          <article className="quote-card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="empty-state">请选择一个用户</div>
          </article>
        )}
      </div>
    </section>
  );
}

interface AdminDashboardProps {
  profile: Profile | null;
  quotes: Quote[];
  groups: GroupInfo[];
  users: AdminUser[];
  whitelist: WhitelistEntry[];
  logs: LoginLog[];
  loading: boolean;
  error: string;
  cursorSettings: CursorSettings;
  onCursorSettingsChange: React.Dispatch<React.SetStateAction<CursorSettings>>;
  onRefresh: () => void;
  onDeleteQuote: (id: string) => Promise<void>;
  onToggleFeatured: (id: string, featured: boolean) => Promise<void>;
  onUpdateRole: (id: number, role: string) => Promise<void>;
  onWhitelistAdd: (email: string) => Promise<void>;
  onWhitelistRemove: (id: number) => Promise<void>;
}

function AdminDashboard({
  profile,
  quotes,
  groups,
  users,
  whitelist,
  logs,
  loading,
  error,
  cursorSettings,
  onCursorSettingsChange,
  onRefresh,
  onDeleteQuote,
  onToggleFeatured,
  onUpdateRole,
  onWhitelistAdd,
  onWhitelistRemove,
}: AdminDashboardProps) {
  const [whitelistEmail, setWhitelistEmail] = useState("");
  const isAdmin = profile?.role === "admin" || profile?.role === "owner";

  const handleWhitelistAdd = async () => {
    if (!whitelistEmail) return;
    await onWhitelistAdd(whitelistEmail);
    setWhitelistEmail("");
  };

  if (!isAdmin) {
    return (
      <section className="admin-page" aria-labelledby="admin-title">
        <div className="admin-head">
          <div>
            <p>ADMIN DASHBOARD</p>
            <h1 id="admin-title">控制台</h1>
          </div>
        </div>
        <div className="admin-grid">
          <div className="empty-state" style={{ padding: 48, textAlign: "center" }}>
            仅管理员可访问控制台。
          </div>
        </div>
      </section>
    );
  }

  if (loading || error) {
    return (
      <section className="admin-page" aria-labelledby="admin-title">
        <div className="admin-head">
          <div>
            <p>ADMIN DASHBOARD</p>
            <h1 id="admin-title">控制台</h1>
          </div>
          <div className="admin-status">
            <Shield size={18} />
            <span>ADMIN VERIFIED</span>
            <button type="button" className="cursor-delay-toggle" onClick={onRefresh} title="刷新数据" style={{ marginLeft: 8 }}>
              <RefreshCcw size={14} />
            </button>
          </div>
        </div>
        <div className="admin-grid">
          <div className="empty-state" style={{ padding: 48, textAlign: "center" }}>
            {loading ? "加载中..." : error}
          </div>
        </div>
      </section>
    );
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
          <span>ADMIN VERIFIED</span>
          <button type="button" className="cursor-delay-toggle" onClick={onRefresh} title="刷新数据" style={{ marginLeft: 8 }}>
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-column admin-main-column">
          <section className="panel table-panel quote-table-panel">
            <PanelTitle icon={Archive} title="言论库" action="REFRESH" onAction={onRefresh} />
            <div className="brutal-table">
              <div className="table-row table-head">
                <span>ID</span>
                <span>Speaker</span>
                <span>Quote</span>
                <span>Ops</span>
              </div>
              {quotes.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>暂无言论数据</div>
              ) : (
                <PageVirtualList
                  items={quotes}
                  rowHeight={ADMIN_TABLE_ROW_HEIGHT}
                  className="virtual-list table-virtual-list"
                  rowClassName="table-row virtual-list-row"
                  maxVisibleRows={ADMIN_TABLE_MAX_VISIBLE_ROWS}
                  getKey={(quote) => quote.id}
                  renderRow={(quote) => (
                    <>
                      <span>{quote.id.slice(-6)}</span>
                      <span>{quote.speaker}</span>
                      <p>{quote.content}</p>
                      <SwitchCluster
                        isFeatured={quote.is_featured}
                        onToggle={() => onToggleFeatured(quote.id, !quote.is_featured)}
                        onDelete={() => onDeleteQuote(quote.id)}
                      />
                    </>
                  )}
                />
              )}
            </div>
          </section>

          <section className="panel table-panel user-table-panel">
            <PanelTitle icon={User} title="用户列表" action="REFRESH" onAction={onRefresh} />
            <div className="brutal-table user-table">
              <div className="table-row table-head">
                <span>User</span>
                <span>Email</span>
                <span>Role</span>
                <span>Actions</span>
              </div>
              {users.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>暂无用户数据</div>
              ) : (
                <PageVirtualList
                  items={users}
                  rowHeight={ADMIN_TABLE_ROW_HEIGHT}
                  className="virtual-list table-virtual-list user-virtual-list"
                  rowClassName="table-row virtual-list-row"
                  maxVisibleRows={ADMIN_USER_MAX_VISIBLE_ROWS}
                  getKey={(user) => user.ID}
                  renderRow={(user) => (
                    <>
                      <span>{user.Nickname}</span>
                      <span>{user.Email}</span>
                      <span>{user.Role}</span>
                      <span>
                        <select
                          value={user.Role}
                          onChange={(e) => onUpdateRole(user.ID, e.target.value)}
                          className="role-select"
                          style={{ padding: "2px 6px", fontSize: 12, background: "#1a1a2e", color: "#e8ddc9", border: "1px solid #333" }}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                          <option value="banned">banned</option>
                        </select>
                      </span>
                    </>
                  )}
                />
              )}
            </div>
          </section>

          <section className="panel table-panel">
            <PanelTitle icon={Lock} title="白名单" action="REFRESH" onAction={onRefresh} />
            <div className="brutal-table" style={{ marginBottom: 8 }}>
              <div className="table-row table-head">
                <span>Email</span>
                <span>Actions</span>
              </div>
              {whitelist.length === 0 ? (
                <div className="empty-state" style={{ padding: 12, fontSize: 13 }}>暂无白名单</div>
              ) : (
                whitelist.map((w) => (
                  <div className="table-row" key={w.ID}>
                    <span>{w.Email}</span>
                    <span>
                      <button
                        type="button"
                        className="cursor-delay-toggle"
                        onClick={() => onWhitelistRemove(w.ID)}
                        style={{ fontSize: 12, padding: "2px 8px" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: "flex", gap: 8, padding: "0 12px 12px" }}>
              <input
                value={whitelistEmail}
                onChange={(e) => setWhitelistEmail(e.target.value)}
                placeholder="输入邮箱地址"
                style={{ flex: 1, padding: "4px 8px", fontSize: 12, background: "#1a1a2e", color: "#e8ddc9", border: "1px solid #333" }}
                onKeyDown={(e) => { if (e.key === "Enter") handleWhitelistAdd(); }}
              />
              <button type="button" className="mini-switch is-on" onClick={handleWhitelistAdd} style={{ padding: "4px 12px", fontSize: 12 }}>
                <Plus size={12} /> Add
              </button>
            </div>
          </section>

          <section className="panel terminal-panel">
            <PanelTitle icon={Terminal} title="登录日志" action="LIVE" />
            {logs.length === 0 ? (
              <div className="terminal-window" style={{ padding: 12 }}>
                <p className="terminal-line" style={{ opacity: 0.5 }}>暂无登录日志</p>
              </div>
            ) : (
              <PageVirtualList
                items={logs}
                rowHeight={ADMIN_LOG_ROW_HEIGHT}
                className="terminal-window virtual-list terminal-virtual-list"
                rowClassName="terminal-line virtual-list-row"
                maxVisibleRows={ADMIN_LOG_MAX_VISIBLE_ROWS}
                getKey={(log) => log.ID}
                renderRow={(log) => (
                  <p className={!log.Success ? "is-failed" : ""}>
                    <span>{new Date(log.CreatedAt).toLocaleTimeString()}</span> auth:{log.Success ? "ok" : "fail"} user_id={log.UserID} ip={log.IP}
                    {log.FailReason ? ` (${log.FailReason})` : ""}
                  </p>
                )}
              />
            )}
          </section>
        </div>

        <div className="admin-column admin-side-column">
          <section className="panel radar-panel">
            <PanelTitle icon={Radar} title="QQ 群信息" action="PING" />
            <div className="radar-screen">
              <span className="radar-sweep" />
              <span className="radar-ring radar-ring-a" />
              <span className="radar-ring radar-ring-b" />
              <span className="radar-ring radar-ring-c" />
              {groups.map((group, index) => (
                <span
                  key={group.id}
                  className={`radar-dot radar-dot-${index + 1} is-online`}
                  title={group.name}
                />
              ))}
              <div className="radar-readout">
                {groups.length === 0 ? (
                  <div className="empty-state">暂无群信息</div>
                ) : (
                  groups.map((group) => (
                    <div key={group.id}>
                      <span>{group.id}</span>
                      <strong>{group.name}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <CursorSettingsPanel settings={cursorSettings} onChange={onCursorSettingsChange} />
        </div>
      </div>
    </section>
  );
}

interface CursorSettingsPanelProps {
  settings: CursorSettings;
  onChange: React.Dispatch<React.SetStateAction<CursorSettings>>;
}

function CursorSettingsPanel({ settings, onChange }: CursorSettingsPanelProps) {
  const updateSetting = <Key extends keyof CursorSettings>(key: Key, value: CursorSettings[Key]) => {
    onChange((current) => normalizeCursorSettings({ ...current, [key]: value }));
  };

  const resetSettings = () => {
    onChange(DEFAULT_CURSOR_SETTINGS);
  };

  return (
    <section className="panel cursor-settings-panel" aria-labelledby="cursor-settings-title">
      <PanelTitle
        icon={MousePointer2}
        title="光标自定义"
        action="RESET"
        titleId="cursor-settings-title"
        onAction={resetSettings}
      />
      <div className="cursor-settings-body">
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
        style={{ "--range-progress": `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
      />
      <strong>{value}px</strong>
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
  icon: typeof Activity;
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

interface SwitchClusterProps {
  isFeatured: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

function SwitchCluster({ isFeatured, onToggle, onDelete }: SwitchClusterProps) {
  return (
    <div className="switch-cluster">
      <button type="button" aria-label={isFeatured ? "取消精华" : "设为精华"} onClick={onToggle}>
        <span style={{ opacity: isFeatured ? 1 : 0.4 }}>★</span>
      </button>
      <button type="button" aria-label="删除言论" onClick={onDelete}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default App;
