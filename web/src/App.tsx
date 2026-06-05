import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Archive,
  ChevronRight,
  CircleDot,
  KeyRound,
  LayoutDashboard,
  Mail,
  Plus,
  Power,
  RefreshCcw,
  Send,
  Shield,
  Sparkles,
  Terminal,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { api, tokenStore } from "./api";
import { FluidShader } from "./components/FluidShader";
import type { AdminUser, AuthMode, GroupInfo, LoginLog, Profile, Quote, QuotePerson, View } from "./types";

const views: Array<{ id: View; label: string; icon: typeof KeyRound }> = [
  { id: "auth", label: "AUTH", icon: KeyRound },
  { id: "archive", label: "ARCHIVE", icon: Archive },
  { id: "admin", label: "ADMIN", icon: LayoutDashboard },
];

const VIRTUAL_LIST_OVERSCAN = 6;
const ADMIN_TABLE_ROW_HEIGHT = 58;
const ADMIN_LOG_ROW_HEIGHT = 28;
const ADMIN_TABLE_MAX_VISIBLE_ROWS = 8;
const ADMIN_USER_MAX_VISIBLE_ROWS = 5;
const ADMIN_LOG_MAX_VISIBLE_ROWS = 10;

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
  if (!quotes.length) return [];

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
        history: sorted,
      };
    });
}

function App() {
  const [view, setView] = useState<View>(getInitialView);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Archive data
  const [people, setPeople] = useState<QuotePerson[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  // Admin data
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

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
    ])
      .then(([q, g, u, l]) => {
        if (cancelled) return;
        setQuotes(q);
        setGroups(g);
        setAdminUsers(u);
        setLoginLogs(l);
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
    setView("auth");
  };

  const refreshAdmin = useCallback(async () => {
    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) return;
    setAdminError("");
    try {
      const [q, g, u, l] = await Promise.all([
        api.quotes(),
        api.groups(),
        api.adminUsers(),
        api.loginLogs(),
      ]);
      setQuotes(q);
      setGroups(g);
      setAdminUsers(u);
      setLoginLogs(l);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "刷新失败");
    }
  }, [profile]);

  const refreshArchive = useCallback(async () => {
    if (!profile) return;
    try {
      const [q, g] = await Promise.all([api.quotes(), api.groups()]);
      setPeople(createPeopleFromQuotes(q));
      setGroups(g);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "刷新失败");
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
    <main ref={appShellRef} className={`app app-${view}`}>
      <AcidGeometry />
      <TopNav currentView={view} onChange={setView} profile={profile} onSignOut={handleSignOut} />
      {view === "auth" && <AuthPage onAuthenticated={handleAuthenticated} />}
      {view === "archive" && (
        <ArchivePage
          people={people}
          groups={groups}
          loading={archiveLoading}
          error={archiveError}
          onQuoteCreated={refreshArchive}
        />
      )}
      {view === "admin" && (
        <AdminDashboard
            profile={profile}
            quotes={quotes}
            users={adminUsers}
            logs={loginLogs}
            loading={adminLoading}
            error={adminError}
            onRefresh={refreshAdmin}
            onDeleteQuote={async (id) => { await api.deleteQuote(id); refreshAdmin(); }}
            onToggleFeatured={async (id, featured) => { await api.toggleFeatured(id, featured); refreshAdmin(); }}
            onUpdateRole={async (id, role) => { await api.adminUpdateRole(id, role); refreshAdmin(); }}
          />
      )}
    </main>
  );
}

/* ───────── TopNav ───────── */

interface TopNavProps {
  currentView: View;
  profile: Profile | null;
  onChange: (view: View) => void;
  onSignOut: () => void;
}

function TopNav({ currentView, profile, onChange, onSignOut }: TopNavProps) {
  const isAdmin = profile?.role === "admin" || profile?.role === "owner";

  const visibleViews = profile
    ? isAdmin
      ? views.filter((v) => v.id !== "auth")
      : views.filter((v) => v.id === "archive")
    : views.filter((v) => v.id === "auth");

  return (
    <nav className="top-nav" aria-label="主导航">
      <button className="brand-mark" type="button" onClick={() => onChange(profile ? "archive" : "auth")} aria-label="返回档案页">
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
      {profile ? (
        <div className="profile-chip" aria-label="用户信息">
          <User size={15} />
          <span>{profile.nickname}</span>
          <button type="button" className="sign-out-btn" onClick={onSignOut} title="退出登录">
            <Power size={14} />
          </button>
        </div>
      ) : null}
    </nav>
  );
}

/* ───────── Acid Geometry ───────── */

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

/* ───────── Auth Page ───────── */

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
            <input autoComplete="email" placeholder="your@email.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </span>
        </label>
        <div className={mode === "register" ? "auth-extra-field is-open" : "auth-extra-field"} aria-hidden={mode !== "register"}>
          <div className="auth-extra-field-inner">
            <label className="field">
              <span>昵称</span>
              <span className="input-shell">
                <User size={17} />
                <input autoComplete="nickname" disabled={mode !== "register"} placeholder="你的昵称" value={nickname} onChange={(event) => setNickname(event.target.value)} />
              </span>
            </label>
          </div>
        </div>
        <label className="field">
          <span>密码</span>
          <span className="input-shell">
            <Lock size={17} />
            <input autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" placeholder="至少 6 位密码" value={password} onChange={(event) => setPassword(event.target.value)} />
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

/* ───────── Archive Page ───────── */

interface ArchivePageProps {
  people: QuotePerson[];
  groups: GroupInfo[];
  loading: boolean;
  error: string;
  onQuoteCreated: () => void;
}

function ArchivePage({ people, groups, loading, error, onQuoteCreated }: ArchivePageProps) {
  const [selectedId, setSelectedId] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [createGroup, setCreateGroup] = useState("");
  const [createSpeaker, setCreateSpeaker] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  useEffect(() => {
    if (!people.some((person) => person.id === selectedId)) {
      setSelectedId(people[0]?.id ?? "");
      setSelectedQuoteId("");
    }
  }, [people, selectedId]);

  // Reset selectedQuoteId when selected person changes
  useEffect(() => {
    setSelectedQuoteId("");
  }, [selectedId]);

  async function handleCreateQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    if (!createGroup || !createContent) {
      setCreateError("QQ群和言论内容为必填。");
      return;
    }
    setCreateSubmitting(true);
    try {
      await api.createQuote(createGroup, createSpeaker, createContent);
      setCreateGroup("");
      setCreateSpeaker("");
      setCreateContent("");
      setShowCreate(false);
      onQuoteCreated();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setCreateSubmitting(false);
    }
  }

  const selected = useMemo(
    () => people.find((person) => person.id === selectedId) ?? null,
    [people, selectedId],
  );

  const selectedQuote = useMemo(
    () => selected?.history.find((q) => q.id === selectedQuoteId) ?? selected?.history[0] ?? null,
    [selected, selectedQuoteId],
  );

  // Auto-select first quote when person changes
  useEffect(() => {
    if (selected && selected.history.length > 0 && !selectedQuote) {
      setSelectedQuoteId(selected.history[0].id);
    }
  }, [selected, selectedQuote]);

  if (loading || error) {
    return (
      <section className="archive-page">
        <div className="archive-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="quote-detail-empty">{loading ? "加载中..." : error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="archive-page" aria-labelledby="archive-title">
      <div className="archive-shell">
        {/* Left Column: Person List */}
        <aside className="pack-menu" aria-label="用户卡包">
          <div className="pack-title">
            <span id="archive-title">CARD PACK</span>
            <Sparkles size={17} />
          </div>
          <div className="pack-list">
            {people.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>暂无数据</div>
            ) : (
              people.map((person) => (
                <button
                  type="button"
                  key={person.id}
                  className={selected && person.id === selected.id ? "pack-card is-selected" : "pack-card"}
                  onClick={() => { setSelectedId(person.id); }}
                >
                  <span className="pack-card-name">{person.name}</span>
                  <span className="pack-card-group">{person.qqGroup}</span>
                </button>
              ))
            )}
          </div>
          <button type="button" className="pack-create-btn" onClick={() => setShowCreate(true)} title="添加言论">
            <Plus size={16} />
            <span>添加言论</span>
          </button>
        </aside>

        {/* Middle Column: Quote List */}
        {selected ? (
          <div className="quote-list-panel">
            <div className="quote-list-head">
              <span>QUOTES</span>
              <span>{selected.history.length} ROWS</span>
            </div>
            <div className="quote-list-body">
              {selected.history.length === 0 ? (
                <div className="empty-state" style={{ minHeight: 80 }}>暂无言论</div>
              ) : (
                selected.history.map((quote) => (
                  <div
                    key={quote.id}
                    className={selectedQuote?.id === quote.id ? "quote-list-item is-selected" : "quote-list-item"}
                    onClick={() => setSelectedQuoteId(quote.id)}
                  >
                    <p>{quote.content}</p>
                    <time>{formatDate(quote.created_at)}</time>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="quote-detail-empty">请选择一个用户</div>
        )}

        {/* Right Column: Quote Detail */}
        {selectedQuote ? (
          <div className="quote-detail-panel">
            <div className="quote-detail-head">
              <p className="detail-speaker">{selectedQuote.speaker}</p>
              <p className="detail-group">{selectedQuote.qq_group}</p>
            </div>
            <div className="quote-detail-body">
              <blockquote>{selectedQuote.content}</blockquote>
            </div>
            <div className="quote-detail-foot">
              <time>{formatDate(selectedQuote.created_at)}</time>
              {selectedQuote.is_featured && <span className="featured-badge">★ FEATURED</span>}
            </div>
          </div>
        ) : (
          <div className="quote-detail-empty">请选择一条言论</div>
        )}
      </div>

      {/* Create Quote Modal */}
      {showCreate && (
        <div className="create-quote-overlay" onClick={() => setShowCreate(false)}>
          <div className="create-quote-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close-btn" onClick={() => setShowCreate(false)} aria-label="关闭">
              <X size={18} />
            </button>
            <h3>记录新言论</h3>
            <form onSubmit={handleCreateQuote}>
              <label className="field">
                <span>QQ群号</span>
                <input
                  value={createGroup}
                  onChange={(e) => setCreateGroup(e.target.value)}
                  placeholder="例如: 8305"
                />
              </label>
              <label className="field">
                <span>发言人</span>
                <input
                  value={createSpeaker}
                  onChange={(e) => setCreateSpeaker(e.target.value)}
                  placeholder="可选，留空为匿名"
                />
              </label>
              <label className="field">
                <span>言论内容</span>
                <textarea
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  placeholder="金句内容..."
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </label>
              {createError && <p className="form-error">{createError}</p>}
              <button type="submit" disabled={createSubmitting} className="primary-action">
                <Send size={16} />
                <span>{createSubmitting ? "提交中..." : "记录"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

/* ───────── Admin Dashboard ───────── */

interface AdminDashboardProps {
  profile: Profile | null;
  quotes: Quote[];
  users: AdminUser[];
  logs: LoginLog[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onDeleteQuote: (id: string) => Promise<void>;
  onToggleFeatured: (id: string, featured: boolean) => Promise<void>;
  onUpdateRole: (id: number, role: string) => Promise<void>;
}

function AdminDashboard({
  profile,
  quotes,
  users,
  logs,
  loading,
  error,
  onRefresh,
  onDeleteQuote,
  onToggleFeatured,
  onUpdateRole,
}: AdminDashboardProps) {
  const isAdmin = profile?.role === "admin" || profile?.role === "owner";

  if (!isAdmin) {
    return (
      <section className="admin-page">
        <div className="admin-head">
          <div><p>ADMIN DASHBOARD</p><h1>控制台</h1></div>
        </div>
        <div className="admin-grid">
          <div className="empty-state" style={{ padding: 48, textAlign: "center" }}>仅管理员可访问控制台。</div>
        </div>
      </section>
    );
  }

  if (loading || error) {
    return (
      <section className="admin-page">
        <div className="admin-head">
          <div><p>ADMIN DASHBOARD</p><h1>控制台</h1></div>
          <div className="admin-status">
            <Shield size={18} /><span>ADMIN VERIFIED</span>
            <button type="button" onClick={onRefresh} title="刷新" style={{ marginLeft: 8 }}><RefreshCcw size={14} /></button>
          </div>
        </div>
        <div className="admin-grid">
          <div className="empty-state" style={{ padding: 48, textAlign: "center" }}>{loading ? "加载中..." : error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <div className="admin-head">
        <div><p>ADMIN DASHBOARD</p><h1>控制台</h1></div>
        <div className="admin-status">
          <Shield size={18} /><span>ADMIN VERIFIED</span>
          <button type="button" onClick={onRefresh} title="刷新" style={{ marginLeft: 8 }}><RefreshCcw size={14} /></button>
        </div>
      </div>

      <div className="admin-grid">
        {/* 言论库 */}
        <section className="panel table-panel">
          <PanelTitle icon={Archive} title="言论库" action="REFRESH" onAction={onRefresh} />
          <div className="brutal-table">
            <div className="table-row table-head">
              <span>ID</span><span>Speaker</span><span>Quote</span><span>Ops</span>
            </div>
            {quotes.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>暂无言论数据</div>
            ) : (
              <PageVirtualList
                items={quotes} rowHeight={ADMIN_TABLE_ROW_HEIGHT}
                className="virtual-list table-virtual-list" rowClassName="table-row virtual-list-row"
                maxVisibleRows={ADMIN_TABLE_MAX_VISIBLE_ROWS} getKey={(q) => q.id}
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

        {/* 用户列表 */}
        <section className="panel table-panel user-table-panel">
          <PanelTitle icon={User} title="用户列表" action="REFRESH" onAction={onRefresh} />
          <div className="brutal-table user-table">
            <div className="table-row table-head">
              <span>User</span><span>Email</span><span>Role</span><span>Actions</span>
            </div>
            {users.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}>暂无用户数据</div>
            ) : (
              <PageVirtualList
                items={users} rowHeight={ADMIN_TABLE_ROW_HEIGHT}
                className="virtual-list table-virtual-list user-virtual-list" rowClassName="table-row virtual-list-row"
                maxVisibleRows={ADMIN_USER_MAX_VISIBLE_ROWS} getKey={(u) => u.ID}
                renderRow={(user) => (
                  <>
                    <span>{user.Nickname}</span>
                    <span>{user.Email}</span>
                    <span style={user.Role === "banned" ? { color: "#f44" } : user.Role === "admin" ? { color: "#4af" } : undefined}>{user.Role}</span>
                    <span>
                      <select
                        value={user.Role} onChange={(e) => onUpdateRole(user.ID, e.target.value)}
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

        {/* 登录日志 */}
        <section className="panel terminal-panel">
          <PanelTitle icon={Terminal} title="登录日志" action="LIVE" />
          {logs.length === 0 ? (
            <div className="terminal-window" style={{ padding: 12 }}><p className="terminal-line" style={{ opacity: 0.5 }}>暂无登录日志</p></div>
          ) : (
            <PageVirtualList
              items={logs} rowHeight={ADMIN_LOG_ROW_HEIGHT}
              className="terminal-window virtual-list terminal-virtual-list" rowClassName="terminal-line virtual-list-row"
              maxVisibleRows={ADMIN_LOG_MAX_VISIBLE_ROWS} getKey={(l) => l.ID}
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
    </section>
  );
}

/* ───────── Shared Components ───────── */

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
