import type { AdminUser, LoginLog, Quote, Speaker } from "./types";

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const initialMockQuotes = [
  {
    qid: "Q-ACID-001",
    content: "我不是迟到，我是在给会议制造压轴登场的仪式感。",
    suppression: 72,
    ai_comment: "典型的高压环境幽默化表达，具备强烈的自我叙事能力。",
    userdata: { qqnumber: "10001", speaker: "档案管理员" },
    groupdata: { groupnumber: "92837465", groupname: "Hall of Fame 总群" },
    attachmentid: ["poster-001"],
    is_featured: true,
    created_at: "2026-06-08 09:12:20",
  },
  {
    qid: "Q-ACID-002",
    content: "如果 bug 没有复现，那它现在就是薛定谔的特性。",
    suppression: 64,
    ai_comment: "研发团队常见幸存者偏差样本，建议保留为警示语。",
    userdata: { qqnumber: "10002", speaker: "凌晨三点" },
    groupdata: { groupnumber: "92837465", groupname: "Hall of Fame 总群" },
    attachmentid: [],
    is_featured: true,
    created_at: "2026-06-08 10:35:44",
  },
  {
    qid: "Q-ACID-003",
    content: "这不是需求变更，这是产品在和宇宙同步频率。",
    suppression: 88,
    ai_comment: "高浓度需求漂移样本，建议与版本冻结通知配套展示。",
    userdata: { qqnumber: "10003", speaker: "产品炼金术士" },
    groupdata: { groupnumber: "77118822", groupname: "灵感回收站" },
    attachmentid: ["board-003"],
    is_featured: true,
    created_at: "2026-06-08 11:08:02",
  },
  {
    qid: "Q-ACID-004",
    content: "上线前我只相信三件事：缓存、重启，以及没人点那个按钮。",
    suppression: 91,
    ai_comment: "风险意识强，但对用户好奇心评估偏低。",
    userdata: { qqnumber: "10004", speaker: "运维诗人" },
    groupdata: { groupnumber: "77118822", groupname: "灵感回收站" },
    attachmentid: ["terminal-004"],
    is_featured: true,
    created_at: "2026-06-08 12:22:17",
  },
  {
    qid: "Q-ACID-005",
    content: "先别删日志，等我把故事编圆。",
    suppression: 53,
    userdata: { qqnumber: "10002", speaker: "凌晨三点" },
    groupdata: { groupnumber: "92837465", groupname: "Hall of Fame 总群" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-07 23:41:09",
  },
  {
    qid: "Q-ACID-006",
    content: "CSS 没有崩，它只是用另一种布局表达自由。",
    suppression: 37,
    ai_comment: "视觉层异常的浪漫化描述，可用于前端团队周报封面。",
    userdata: { qqnumber: "10005", speaker: "像素暴徒" },
    groupdata: { groupnumber: "88660011", groupname: "前端霓虹仓库" },
    attachmentid: ["layout-006"],
    is_featured: false,
    created_at: "2026-06-07 19:15:33",
  },
  {
    qid: "Q-ACID-007",
    content: "这个按钮先放这，等设计师醒了再审判。",
    suppression: 46,
    userdata: { qqnumber: "10005", speaker: "像素暴徒" },
    groupdata: { groupnumber: "88660011", groupname: "前端霓虹仓库" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-07 18:02:11",
  },
  {
    qid: "Q-ACID-008",
    content: "数据库说它不慢，只是每次查询前都要思考人生。",
    suppression: 79,
    ai_comment: "性能问题被人格化后更容易传播，但不利于定位索引缺失。",
    userdata: { qqnumber: "10006", speaker: "索引巫师" },
    groupdata: { groupnumber: "66442001", groupname: "慢查询博物馆" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-07 16:48:51",
  },
  {
    qid: "Q-ACID-009",
    content: "我已经优化过了：从必现改成偶现。",
    suppression: 84,
    ai_comment: "优化成果定义异常，建议进入名人堂永久陈列。",
    userdata: { qqnumber: "10001", speaker: "档案管理员" },
    groupdata: { groupnumber: "92837465", groupname: "Hall of Fame 总群" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-07 15:20:29",
  },
  {
    qid: "Q-ACID-010",
    content: "别问为什么这样写，问就是历史原因，历史已经失联。",
    suppression: 69,
    userdata: { qqnumber: "10007", speaker: "祖传代码守护者" },
    groupdata: { groupnumber: "66442001", groupname: "慢查询博物馆" },
    attachmentid: ["scroll-010"],
    is_featured: false,
    created_at: "2026-06-07 13:09:40",
  },
  {
    qid: "Q-ACID-011",
    content: "测试环境没问题，说明生产环境太敏感。",
    suppression: 95,
    ai_comment: "危险言论强度极高，建议配合红色警报样式观察。",
    userdata: { qqnumber: "10004", speaker: "运维诗人" },
    groupdata: { groupnumber: "77118822", groupname: "灵感回收站" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-07 11:31:25",
  },
  {
    qid: "Q-ACID-012",
    content: "这版先发，下一版我们再尊重现实。",
    suppression: 81,
    userdata: { qqnumber: "10003", speaker: "产品炼金术士" },
    groupdata: { groupnumber: "77118822", groupname: "灵感回收站" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-07 10:04:18",
  },
  {
    qid: "Q-ACID-013",
    content: "我写的不是正则，是给字符串准备的迷宫。",
    suppression: 42,
    ai_comment: "表达生动，但维护成本预期偏高。",
    userdata: { qqnumber: "10008", speaker: "正则园丁" },
    groupdata: { groupnumber: "88660011", groupname: "前端霓虹仓库" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-06 22:19:03",
  },
  {
    qid: "Q-ACID-014",
    content: "用户不会这么操作——这是我今天第三次说这句话。",
    suppression: 76,
    userdata: { qqnumber: "10001", speaker: "档案管理员" },
    groupdata: { groupnumber: "92837465", groupname: "Hall of Fame 总群" },
    attachmentid: ["user-014"],
    is_featured: false,
    created_at: "2026-06-06 20:44:12",
  },
  {
    qid: "Q-ACID-015",
    content: "我们不是没有监控，我们只是对异常保持情绪稳定。",
    suppression: 58,
    userdata: { qqnumber: "10004", speaker: "运维诗人" },
    groupdata: { groupnumber: "77118822", groupname: "灵感回收站" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-06 17:27:55",
  },
  {
    qid: "Q-ACID-016",
    content: "这不是空白页，这是极简主义在加载。",
    suppression: 34,
    userdata: { qqnumber: "10005", speaker: "像素暴徒" },
    groupdata: { groupnumber: "88660011", groupname: "前端霓虹仓库" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-06 14:08:36",
  },
  {
    qid: "Q-ACID-017",
    content: "删库之前我犹豫了，所以这不算冲动。",
    suppression: 98,
    ai_comment: "危险等级接近展馆封存线，仅作为演示 mock 数据呈现。",
    userdata: { qqnumber: "10006", speaker: "索引巫师" },
    groupdata: { groupnumber: "66442001", groupname: "慢查询博物馆" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-06 12:00:01",
  },
  {
    qid: "Q-ACID-018",
    content: "需求文档写得很清楚：详见口头沟通。",
    suppression: 61,
    userdata: { qqnumber: "10003", speaker: "产品炼金术士" },
    groupdata: { groupnumber: "77118822", groupname: "灵感回收站" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-05 21:12:48",
  },
  {
    qid: "Q-ACID-019",
    content: "我给变量起这个名字，是为了测试后来者的意志。",
    suppression: 49,
    userdata: { qqnumber: "10007", speaker: "祖传代码守护者" },
    groupdata: { groupnumber: "66442001", groupname: "慢查询博物馆" },
    attachmentid: [],
    is_featured: false,
    created_at: "2026-06-05 18:33:07",
  },
  {
    qid: "Q-ACID-020",
    content: "这个动画不是卡，是在给 GPU 一个表现机会。",
    suppression: 29,
    userdata: { qqnumber: "10008", speaker: "正则园丁" },
    groupdata: { groupnumber: "88660011", groupname: "前端霓虹仓库" },
    attachmentid: ["motion-020"],
    is_featured: false,
    created_at: "2026-06-05 16:10:19",
  },
] satisfies Quote[];

export const initialMockUsers = [
  { uid: "mock-admin", email: "operator@hall.local", nickname: "Archive Operator", role: "admin", last_login: "2026-06-08 12:30:12", enabled: true },
  { uid: "u-1001", email: "night@hall.local", nickname: "凌晨三点", role: "user", last_login: "2026-06-08 10:12:44", enabled: true },
  { uid: "u-1002", email: "pm@hall.local", nickname: "产品炼金术士", role: "user", last_login: "2026-06-07 22:05:19", enabled: true },
  { uid: "u-1003", email: "ops@hall.local", nickname: "运维诗人", role: "admin", last_login: "2026-06-07 19:44:51", enabled: true },
  { uid: "u-1004", email: "pixel@hall.local", nickname: "像素暴徒", role: "user", last_login: "2026-06-06 21:08:33", enabled: true },
  { uid: "u-1005", email: "slow-query@hall.local", nickname: "索引巫师", role: "banned", last_login: "2026-06-05 08:17:01", enabled: false },
  { uid: "u-1006", email: "legacy@hall.local", nickname: "祖传代码守护者", role: "user", last_login: "2026-06-04 23:59:59", enabled: true },
  { uid: "u-1007", email: "regex@hall.local", nickname: "正则园丁", role: "user", last_login: "2026-06-04 12:45:03", enabled: true },
  { uid: "u-1008", email: "guest@hall.local", nickname: "围观群众", role: "user", last_login: "2026-06-03 17:20:30", enabled: true },
] satisfies AdminUser[];

export const initialMockLoginLogs = [
  { id: "log-001", at: "2026-06-08 12:31:02", email: "operator@hall.local", ip: "127.0.0.1", result: "success" },
  { id: "log-002", at: "2026-06-08 11:58:44", email: "night@hall.local", ip: "10.0.8.21", result: "success" },
  { id: "log-003", at: "2026-06-08 11:40:19", email: "unknown@hall.local", ip: "10.0.8.99", result: "failed" },
  { id: "log-004", at: "2026-06-08 10:22:07", email: "pm@hall.local", ip: "10.0.7.13", result: "success" },
  { id: "log-005", at: "2026-06-08 09:18:32", email: "ops@hall.local", ip: "10.0.1.5", result: "success" },
  { id: "log-006", at: "2026-06-08 08:55:10", email: "root@hall.local", ip: "192.168.8.8", result: "failed" },
  { id: "log-007", at: "2026-06-07 23:45:28", email: "pixel@hall.local", ip: "10.0.6.24", result: "success" },
  { id: "log-008", at: "2026-06-07 22:19:15", email: "legacy@hall.local", ip: "10.0.3.77", result: "success" },
  { id: "log-009", at: "2026-06-07 21:02:43", email: "slow-query@hall.local", ip: "10.0.4.12", result: "failed" },
  { id: "log-010", at: "2026-06-07 19:35:01", email: "regex@hall.local", ip: "10.0.9.30", result: "success" },
  { id: "log-011", at: "2026-06-07 17:26:48", email: "guest@hall.local", ip: "10.0.2.14", result: "success" },
  { id: "log-012", at: "2026-06-07 14:11:23", email: "admin@hall.local", ip: "172.16.0.42", result: "failed" },
  { id: "log-013", at: "2026-06-07 11:09:17", email: "operator@hall.local", ip: "127.0.0.1", result: "success" },
  { id: "log-014", at: "2026-06-06 23:50:05", email: "pm@hall.local", ip: "10.0.7.13", result: "success" },
  { id: "log-015", at: "2026-06-06 21:42:58", email: "pixel@hall.local", ip: "10.0.6.24", result: "success" },
  { id: "log-016", at: "2026-06-06 20:03:36", email: "demo@hall.local", ip: "10.0.0.66", result: "failed" },
  { id: "log-017", at: "2026-06-06 18:27:14", email: "ops@hall.local", ip: "10.0.1.5", result: "success" },
  { id: "log-018", at: "2026-06-06 16:18:29", email: "legacy@hall.local", ip: "10.0.3.77", result: "success" },
] satisfies LoginLog[];

export function cloneQuote(quote: Quote): Quote {
  return {
    ...quote,
    userdata: { ...quote.userdata },
    groupdata: { ...quote.groupdata },
    attachmentid: [...quote.attachmentid],
  };
}

export function cloneUser(user: AdminUser): AdminUser {
  return { ...user };
}

export function cloneLoginLog(log: LoginLog): LoginLog {
  return { ...log };
}

export function cloneSpeaker(speaker: Speaker): Speaker {
  return { ...speaker };
}

export function paginate<T>(items: T[], page = 1, pageSize = 20): PageResult<T> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    total: items.length,
    page: safePage,
    page_size: safePageSize,
  };
}

export function speakersFromQuotes(quotes: Quote[], hiddenSpeakerIds = new Set<string>()): Speaker[] {
  const speakerMap = new Map<string, Speaker>();

  for (const quote of quotes) {
    const qqnumber = quote.userdata.qqnumber;
    if (!qqnumber || hiddenSpeakerIds.has(qqnumber)) {
      continue;
    }

    const current = speakerMap.get(qqnumber);
    if (current) {
      current.quote_count += 1;
      continue;
    }

    speakerMap.set(qqnumber, {
      qqnumber,
      speaker: quote.userdata.speaker || "匿名发言人",
      avatar: quote.userdata.avatar,
      quote_count: 1,
    });
  }

  return Array.from(speakerMap.values()).sort((a, b) => b.quote_count - a.quote_count || a.speaker.localeCompare(b.speaker));
}

export function mockAttachmentUrl(qid: string, attId: string): string {
  const palette = ["#b6ff3b", "#ff4fd8", "#5df2ff", "#ffb000"];
  const seed = `${qid}:${attId}`.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const primary = palette[seed % palette.length];
  const secondary = palette[(seed + 2) % palette.length];
  const label = `${qid}\n${attId}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#090912"/><stop offset="0.58" stop-color="#171428"/><stop offset="1" stop-color="#030305"/></linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="960" height="640" fill="url(#g)"/>
    <path d="M90 500 C210 110 430 650 570 150 S830 420 900 120" fill="none" stroke="${primary}" stroke-width="18" opacity="0.85" filter="url(#glow)"/>
    <circle cx="220" cy="180" r="92" fill="none" stroke="${secondary}" stroke-width="10" opacity="0.85"/>
    <rect x="610" y="300" width="190" height="190" rx="34" fill="none" stroke="${primary}" stroke-width="12" transform="rotate(12 705 395)"/>
    <text x="72" y="92" fill="#f7f1de" font-family="monospace" font-size="34" font-weight="700">MOCK ATTACHMENT</text>
    <text x="72" y="548" fill="#f7f1de" font-family="monospace" font-size="30">${escapeSvg(label)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
