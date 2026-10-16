// Pure aggregation for the Overview view. No `vscode` import and no outer references inside
// `computeOverview`: overview.ts embeds this exact function into the webview with
// Function.prototype.toString, so the code that is tested is the code that ships.
// Keep it free of backticks and "${" so it can sit inside a String.raw template.

export interface OverviewTask {
  id: string;
  title: string;
  path: string;
  column: string;
  tier?: string;
  owner?: string;
  claimedBy?: string;
  due?: string;
  fields: Record<string, string>;
}

export interface OverviewBoard {
  columns: { id: string; label: string; tasks: OverviewTask[] }[];
}

export interface Item {
  id: string;
  title: string;
  path: string;
  column: string;
  /** Days since last update (stale, recent), days past due (overdue), else undefined. */
  days?: number;
  /** The date shown next to the task: updated date or due date. */
  date?: string;
  claimedBy?: string;
}

export interface Overview {
  total: number;
  byStatus: { id: string; label: string; count: number }[];
  byTier: { key: string; count: number }[];
  byOwner: { key: string; count: number }[];
  staleDays: number;
  stale: Item[];
  /** Tasks with no usable updated date (never counted as stale). */
  undated: number;
  claimed: Item[];
  overdue: Item[];
  recent: Item[];
}

export interface OverviewOptions {
  /** `YYYY-MM-DD`. Injected so tests are deterministic; the webview passes the local date. */
  today: string;
  staleDays?: number;
  recentLimit?: number;
}

export function computeOverview(board: OverviewBoard | null | undefined, opts: OverviewOptions): Overview {
  // Real calendar date to a day number, or NaN. Rejects 2026-02-30 and anything not YYYY-MM-DD.
  const dayNum = (s: unknown): number => {
    const m = typeof s === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(s) : null;
    if (!m) return NaN;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    const t = Date.UTC(y, mo - 1, d);
    const back = new Date(t);
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return NaN;
    return Math.round(t / 86400000);
  };
  // Last real date in "Started / updated" (e.g. "none / 2026-10-17" or "2026-10-01").
  const updatedOf = (t: OverviewTask): string | undefined => {
    const raw = t.fields ? t.fields["started / updated"] || t.fields["updated"] || "" : "";
    const found = String(raw).match(/\d{4}-\d{2}-\d{2}/g);
    if (!found) return undefined;
    for (let i = found.length - 1; i >= 0; i--) if (!isNaN(dayNum(found[i]))) return found[i];
    return undefined;
  };
  const bare = (id: string): string => String(id).replace(/^\d+-/, "").toLowerCase();

  const out: Overview = {
    total: 0, byStatus: [], byTier: [], byOwner: [], staleDays: 14,
    stale: [], undated: 0, claimed: [], overdue: [], recent: [],
  };
  const staleDays = typeof opts.staleDays === "number" && isFinite(opts.staleDays) && opts.staleDays >= 0 ? Math.floor(opts.staleDays) : 14;
  const limit = typeof opts.recentLimit === "number" && opts.recentLimit >= 0 ? Math.floor(opts.recentLimit) : 10;
  out.staleDays = staleDays;
  const today = dayNum(opts.today);
  const cols = board && Array.isArray(board.columns) ? board.columns : [];
  const hasNamedDone = cols.some((c) => bare(c.id) === "done" || bare(c.id) === "deploy");
  const tiers = new Map<string, number>();
  const owners = new Map<string, number>();
  const dated: { item: Item; n: number }[] = [];

  cols.forEach((col, ci) => {
    const tasks = Array.isArray(col.tasks) ? col.tasks : [];
    out.byStatus.push({ id: col.id, label: col.label, count: tasks.length });
    const finished = hasNamedDone ? bare(col.id) === "done" || bare(col.id) === "deploy" : cols.length > 1 && ci === cols.length - 1;
    for (const t of tasks) {
      out.total++;
      const tier = t.tier ? String(t.tier) : "none";
      tiers.set(tier, (tiers.get(tier) || 0) + 1);
      const owner = t.owner ? String(t.owner) : "unassigned";
      owners.set(owner, (owners.get(owner) || 0) + 1);
      const base = { id: t.id, title: t.title, path: t.path, column: col.id };
      const claim = t.claimedBy ? String(t.claimedBy).trim() : "";
      if (claim && claim.toLowerCase() !== "none") out.claimed.push({ ...base, claimedBy: claim });
      const upd = updatedOf(t);
      const un = upd ? dayNum(upd) : NaN;
      if (upd && !isNaN(un)) {
        dated.push({ item: { ...base, date: upd, days: isNaN(today) ? undefined : today - un }, n: un });
        if (!finished && !isNaN(today) && today - un >= staleDays) out.stale.push({ ...base, date: upd, days: today - un });
      } else if (!finished) {
        out.undated++;
      }
      const dn = dayNum(t.due);
      if (!finished && !isNaN(dn) && !isNaN(today) && dn < today) out.overdue.push({ ...base, date: t.due, days: today - dn });
    }
  });

  const tierRank = (k: string): number => { const m = /^T(\d+)$/.exec(k); return m ? Number(m[1]) : 1000; };
  out.byTier = [...tiers.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => tierRank(a.key) - tierRank(b.key) || (a.key < b.key ? -1 : 1));
  out.byOwner = [...owners.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1));
  out.stale.sort((a, b) => (b.days || 0) - (a.days || 0) || (a.id < b.id ? -1 : 1));
  out.overdue.sort((a, b) => (b.days || 0) - (a.days || 0) || (a.id < b.id ? -1 : 1));
  out.claimed.sort((a, b) => (a.id < b.id ? -1 : 1));
  dated.sort((a, b) => b.n - a.n || (a.item.id < b.item.id ? -1 : 1));
  out.recent = dated.slice(0, limit).map((d) => d.item);
  return out;
}
