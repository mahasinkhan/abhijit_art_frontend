// src/components/inventory/InventoryOverview.tsx
// ── Overview tab: KPI cards, alert strip, charts, recent activity ─────────────
// Zero npm deps — all charts are hand-drawn SVG. Reads GET /api/inventory/dashboard.
//
// Layout notes (compact pass):
//  · The donut is gone. A ring can't label 40 categories, so the legend beside
//    it grew into an endless scrolling column while the chart itself carried
//    almost no information. Ranked share bars say the same thing in a third of
//    the height and stay readable however many categories exist — the long tail
//    is rolled into a single "Other" row.
//  · Every card is tighter: less padding, smaller type scale, denser tables.

import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import {
  INK, BODY, MUTE, LINE, IVORY, CARD, TERRA, TERRA_DK,
  GOLD, GOLD_LT, GREEN, GREEN_LT, AMBER, RED, RED_LT, SANS,
  CAT_COLORS, catColor, dec, rupee, rfmt,
} from "./types";

// ── API response shape ────────────────────────────────────────────────────────
interface TrendBucket { month: string; purchased: number; consumed: number; wastage: number; }
interface CategoryBucket { name: string; value: number; }
interface TopItem        { id: string; name: string; category: string; value: number; unit: string; quantity: number; }
interface LowItem        { id: string; name: string; category: string; quantity: number; reorderLevel: number; unit: string; }
interface RecentMove     {
  id: string; type: string; delta: number; postBalance: number; note?: string;
  createdAt: string; itemName: string; itemUnit: string;
  supplierName?: string; invoiceNo?: string;
}
interface DashData {
  kpis: { totalItems: number; stockValue: string; lowCount: number; outCount: number; lowStockCount?: number; outOfStockCount?: number; totalPurchased: string; totalConsumed: string; totalWastage: string; };
  trend:      TrendBucket[];
  categories: CategoryBucket[];
  topByValue: TopItem[];
  lowItems:   LowItem[];
  recent:     RecentMove[];
}

/* Chart palette — deliberately lighter than the UI's semantic colours.
   The status colours (GREEN/AMBER/RED) are tuned to shout from a KPI card or a
   badge; at chart scale, where a shape can cover a third of the panel, that
   same saturation overwhelms everything around it. These desaturated cousins
   keep the same hue mapping — green good, amber warning, red out — while
   sitting quietly on the ivory background. */
const SOFT = {
  green:  "#4f9d76",
  terra:  "#d4744c",
  amber:  "#d9a441",
  red:    "#cf6b60",
  track:  "#ece5da",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const MOV_COLOR: Record<string,string> = { purchase:GREEN, consumption:TERRA, wastage:AMBER, opening:GOLD, returned:GREEN, adjustment:MUTE };
const MOV_SIGN:  Record<string,number> = { purchase:1, opening:1, returned:1, consumption:-1, wastage:-1, adjustment:1 };
const MOV_LABEL: Record<string,string> = { purchase:"Purchase", consumption:"Consumption", wastage:"Wastage", opening:"Opening", returned:"Return", adjustment:"Adjustment" };
const dtfmt = (s: string) => new Date(s).toLocaleDateString("en-IN",{day:"numeric",month:"short"});

const fmtD = (s: string) => s ? new Date(s + "T00:00:00").toLocaleDateString("en-IN",{ day:"numeric", month:"short", year:"numeric" }) : "";

/* The backend has shipped this field under a few names over time, and a
   movement whose item was deleted has none at all — so read them all and
   fall back to a dash instead of rendering an empty cell. */
const moveItemName = (mv: any) =>
  String(mv?.itemName ?? mv?.item?.name ?? mv?.name ?? "").trim() || "—";
const moveUnit = (mv: any) =>
  String(mv?.itemUnit ?? mv?.item?.unit ?? mv?.unit ?? "").trim();

/* The trend buckets have shipped under several key names; normalise once so
   both the bar chart and the net-flow chart read the same rows. */
function normTrend(raw: any[]): { month:string; purchased:number; consumed:number; wastage:number }[] {
  return (raw ?? []).map((b: any) => ({
    month:     String(b.month ?? b.label ?? b.period ?? b.date ?? ""),
    purchased: dec(b.purchased ?? b.purchase ?? b.in ?? 0),
    consumed:  dec(b.consumed  ?? b.consumption ?? b.out ?? 0),
    wastage:   dec(b.wastage   ?? 0),
  })).filter(b => b.month);
}

type Gran = "day" | "week" | "month" | "year";
const DEFAULT_SUB: Record<Gran,string> = { day:"Last 14 days", week:"Last 12 weeks", month:"Last 6 months", year:"Last 5 years" };

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skel({ w="100%", h=18 }: { w?: string|number; h?: number }) {
  return <div style={{ width:w, height:h, background:"#f0ece4", borderRadius:2, animation:"inv-pulse 1.4s ease infinite" }}/>;
}

interface Tip { x:number; y:number; label:string; }

export interface OverviewFilter { gran: Gran; from: string; to: string; }

// ═════════════════════════════════════════════════════════════════════════════
export default function InventoryOverview({ filter }: { filter?: OverviewFilter }) {
  const [data,    setData]    = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [tip,     setTip]     = useState<Tip | null>(null);

  // filter comes from the tab header (index.tsx); default to last 6 months
  const gran = filter?.gran ?? "month";
  const from = filter?.from ?? "";
  const to   = filter?.to   ?? "";

  useEffect(() => {
    setLoading(true);
    const params: Record<string,string> = { granularity: gran };
    if (from) params.from = from;
    if (to)   params.to   = to;
    api.get("/api/inventory/dashboard", { params })
      .then(r => setData(r.data))
      .catch(() => setError("Couldn't load overview data."))
      .finally(() => setLoading(false));
  }, [gran, from, to]);

  const rangeLabel = (from && to) ? `${fmtD(from)} – ${fmtD(to)}` : DEFAULT_SUB[gran];
  const kpiSub = (from || to) ? "Selected range" : DEFAULT_SUB[gran];

  // ── Chart dimensions ────────────────────────────────────────────────────────
  const BAR_W = 560; const BAR_H = 132; const BAR_PAD = 30;

  // ── Trend bar chart ─────────────────────────────────────────────────────────
  const renderTrend = () => {
    const t = normTrend(data?.trend ?? []);

    if (!t.length) return <div style={st.chartEmpty}>No movement data in this range.</div>;
    const maxV = Math.max(...t.flatMap(b => [b.purchased, b.consumed, b.wastage]), 1);
    const cols  = t.length;
    const slotW = (BAR_W - BAR_PAD * 2) / cols;
    const barW  = Math.max(Math.min(slotW * 0.24, 14), 2);
    const gap   = Math.max(barW * 0.4, 1);
    const plotH = BAR_H - 16;
    const scaleH = (v: number) => (v / maxV) * plotH;

    const SERIES = [
      { key:"purchased" as const, color:SOFT.green, label:"Purchased" },
      { key:"consumed"  as const, color:SOFT.terra, label:"Consumed"  },
      { key:"wastage"   as const, color:SOFT.amber, label:"Wastage"   },
    ];

    return (
      <div style={{ position:"relative" }}>
        <svg width="100%" viewBox={`0 0 ${BAR_W} ${BAR_H + 18}`} style={{ display:"block" }}>
          {[0,.5,1].map(p => (
            <line key={p} x1={BAR_PAD} y1={BAR_H - p*plotH} x2={BAR_W-BAR_PAD} y2={BAR_H - p*plotH}
              stroke={LINE} strokeWidth={0.8}/>
          ))}
          {t.map((b, i) => {
            const cx     = BAR_PAD + i * slotW + slotW / 2;
            const offset = (3 * barW + 2 * gap) / 2;
            return SERIES.map((s, si) => {
              const h  = scaleH(b[s.key]);
              const bx = cx - offset + si * (barW + gap);
              const by = BAR_H - h;
              return (
                <rect key={s.key} x={bx} y={by} width={barW} height={Math.max(h, 1)}
                  fill={s.color} opacity={0.95} rx={1}
                  style={{ cursor:"pointer" }}
                  onMouseEnter={e => setTip({ x:e.clientX, y:e.clientY, label:`${b.month}\n${s.label}: ${rfmt(b[s.key])}` })}
                  onMouseLeave={() => setTip(null)}
                />
              );
            });
          })}
          {t.map((b, i) => {
            const step = Math.max(1, Math.ceil(cols / 12));
            if (i % step !== 0 && i !== cols - 1) return null;
            return (
              <text key={i} x={BAR_PAD + i * slotW + slotW / 2} y={BAR_H + 12}
                textAnchor="middle" fontSize={8.5} fill={MUTE}>
                {b.month}
              </text>
            );
          })}
        </svg>
        <div style={{ display:"flex", gap:12, marginTop:6 }}>
          {SERIES.map(s => (
            <div key={s.key} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10.5, color:BODY }}>
              <div style={{ width:8, height:8, borderRadius:2, background:s.color }}/>
              {s.label}
            </div>
          ))}
        </div>
        {tip && (
          <div style={st.tip(tip)}>{tip.label}</div>
        )}
      </div>
    );
  };

  // ── Flow summary ────────────────────────────────────────────────────────────
  // One stacked bar plus three rows. No axes, no scale to misread — just how
  // the range's movement split between buying, using and wasting, and what it
  // left behind. The bars above already carry the per-period detail.
  const renderFlowSummary = () => {
    const t = normTrend(data?.trend ?? []);
    if (!t.length) return null;

    const totals = t.reduce(
      (a, b) => ({ p: a.p + b.purchased, c: a.c + b.consumed, w: a.w + b.wastage }),
      { p: 0, c: 0, w: 0 },
    );
    const moved = totals.p + totals.c + totals.w;
    if (moved <= 0) return null;

    const net = totals.p - totals.c - totals.w;
    const rows = [
      { label: "Purchased", value: totals.p, color: SOFT.green },
      { label: "Consumed",  value: totals.c, color: SOFT.terra },
      { label: "Wastage",   value: totals.w, color: SOFT.amber },
    ];

    return (
      <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${LINE}` }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8, marginBottom:9 }}>
          <div style={{ fontSize:12, fontWeight:800, color:INK }}>Range summary</div>
          <div style={{ fontSize:11, color:MUTE }}>
            Net <b style={{ color: net >= 0 ? GREEN : TERRA, fontVariantNumeric:"tabular-nums" }}>
              {net >= 0 ? "+" : "−"}{rfmt(Math.abs(net))}
            </b>
          </div>
        </div>

        <div style={{ display:"flex", height:10, borderRadius:2, overflow:"hidden", background:SOFT.track, marginBottom:11 }}>
          {rows.filter(r => r.value > 0).map(r => (
            <div key={r.label} style={{ width:`${(r.value / moved) * 100}%`, background:r.color }}
              onMouseEnter={e => setTip({ x:e.clientX, y:e.clientY, label:`${r.label}\n${rfmt(r.value)}` })}
              onMouseLeave={() => setTip(null)}/>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {rows.map(r => (
            <div key={r.label} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11.5 }}>
              <span style={{ width:9, height:9, borderRadius:2, background:r.color, flexShrink:0 }}/>
              <span style={{ flex:1, color:BODY }}>{r.label}</span>
              <span style={{ color:MUTE, fontVariantNumeric:"tabular-nums" }}>{((r.value / moved) * 100).toFixed(1)}%</span>
              <span style={{ color:INK, fontWeight:700, fontVariantNumeric:"tabular-nums", minWidth:74, textAlign:"right" }}>{rfmt(r.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Category share bars (replaces the donut) ────────────────────────────────
  const catRows = useMemo(() => {
    const cats = [...(data?.categories ?? [])].sort((a,b) => b.value - a.value);
    const total = cats.reduce((s,c) => s + c.value, 0) || 1;
    const CUT = 8;
    if (cats.length <= CUT + 1) {
      return { total, rows: cats.map((c,i) => ({ ...c, color: catColor(i) })), hidden: 0 };
    }
    const head = cats.slice(0, CUT).map((c,i) => ({ ...c, color: catColor(i) }));
    const tail = cats.slice(CUT);
    const rest = tail.reduce((s,c) => s + c.value, 0);
    return {
      total,
      rows: [...head, { name:`Other (${tail.length})`, value:rest, color:"#cfc7ba" }],
      hidden: tail.length,
    };
  }, [data]);

  const renderCategories = () => {
    const { total, rows } = catRows;
    if (!rows.length) return <div style={st.chartEmpty}>No stock data yet.</div>;
    const maxV = Math.max(...rows.map(r => r.value), 1);
    return (
      <div>
        <div style={st.catTotal}>
          <span style={{ color:MUTE }}>Total stock value</span>
          <b style={{ color:INK, fontVariantNumeric:"tabular-nums" }}>{rfmt(total)}</b>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {rows.map((c,i) => {
            const pct = (c.value / total) * 100;
            return (
              <div key={c.name + i}
                onMouseEnter={e => setTip({ x:e.clientX, y:e.clientY, label:`${c.name}\n${rfmt(c.value)} · ${pct.toFixed(1)}%` })}
                onMouseLeave={() => setTip(null)}
                style={{ cursor:"default" }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:8, fontSize:11.5, marginBottom:3 }}>
                  <span style={{ flex:1, color:BODY, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                  <span style={{ color:MUTE, fontVariantNumeric:"tabular-nums", flexShrink:0 }}>{pct.toFixed(1)}%</span>
                  <span style={{ color:INK, fontWeight:700, fontVariantNumeric:"tabular-nums", flexShrink:0, minWidth:64, textAlign:"right" }}>{rfmt(c.value)}</span>
                </div>
                <div style={{ height:6, background:SOFT.track, borderRadius:2 }}>
                  <div style={{ height:6, borderRadius:2, background:c.color, opacity:.92, width:`${(c.value/maxV)*100}%`, transition:"width .4s ease" }}/>
                </div>
              </div>
            );
          })}
        </div>
        {tip && <div style={st.tip(tip)}>{tip.label}</div>}
      </div>
    );
  };

  // ── Stock health donut ──────────────────────────────────────────────────────
  // Three states, one ring: how many items are comfortable, how many have hit
  // the reorder level, and how many have run out. A count split like this is
  // exactly what a donut is good at — unlike the 39-category value split,
  // which needed ranked bars instead.
  const renderHealth = () => {
    const low = Number(k?.lowCount ?? k?.lowStockCount ?? 0);
    const out = Number(k?.outCount ?? k?.outOfStockCount ?? 0);
    const total = Number(k?.totalItems ?? 0) || (low + out);
    const ok = Math.max(total - low - out, 0);
    if (total <= 0) return <div style={st.chartEmpty}>No items yet.</div>;

    const parts = [
      { label:"Healthy",      value:ok,  color:SOFT.green },
      { label:"Low stock",    value:low, color:SOFT.amber },
      { label:"Out of stock", value:out, color:SOFT.red   },
    ].filter(p => p.value > 0);

    const R = 62, CX = 74, CY = 74, THICK = 20;
    let angle = -Math.PI / 2;
    const arcs = parts.map(p => {
      const sweep = (p.value / total) * 2 * Math.PI;
      const a0 = angle, a1 = angle + sweep;
      angle = a1;
      const large = sweep > Math.PI ? 1 : 0;
      // a full-circle single slice can't be drawn as one arc — use a ring instead
      const full = parts.length === 1;
      const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0);
      const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
      return { ...p, full, d:`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`, pct:(p.value/total)*100 };
    });

    return (
      <div style={{ display:"flex", alignItems:"center", gap:18, flexWrap:"wrap" }}>
        <svg width={CX*2} height={CY*2} style={{ flexShrink:0 }}>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={SOFT.track} strokeWidth={THICK}/>
          {arcs.map((a,i) => a.full
            ? <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={a.color} strokeWidth={THICK}/>
            : <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={THICK} strokeLinecap="butt"
                style={{ cursor:"pointer" }}
                onMouseEnter={e => setTip({ x:e.clientX, y:e.clientY, label:`${a.label}\n${a.value} of ${total} items (${a.pct.toFixed(0)}%)` })}
                onMouseLeave={() => setTip(null)}/>
          )}
          <text x={CX} y={CY-3} textAnchor="middle" fontSize={22} fontWeight={800} fill={INK}>{total}</text>
          <text x={CX} y={CY+13} textAnchor="middle" fontSize={9.5} fill={MUTE}>items</text>
        </svg>

        <div style={{ flex:1, minWidth:150, display:"flex", flexDirection:"column", gap:9 }}>
          {[
            { label:"Healthy",      value:ok,  color:SOFT.green, ink:GREEN, hint:"Above reorder level" },
            { label:"Low stock",    value:low, color:SOFT.amber, ink:AMBER, hint:"At or below reorder" },
            { label:"Out of stock", value:out, color:SOFT.red,   ink:RED,   hint:"Needs restocking" },
          ].map(p => (
            <div key={p.label} style={{ display:"flex", alignItems:"center", gap:9 }}>
              <span style={{ width:10, height:10, borderRadius:2, background:p.color, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:BODY, fontWeight:600 }}>{p.label}</div>
                <div style={{ fontSize:10, color:MUTE }}>{p.hint}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:15, fontWeight:800, color:p.value > 0 ? p.ink : MUTE, fontVariantNumeric:"tabular-nums", lineHeight:1.1 }}>{p.value}</div>
                <div style={{ fontSize:9.5, color:MUTE, fontVariantNumeric:"tabular-nums" }}>{total ? ((p.value/total)*100).toFixed(0) : 0}%</div>
              </div>
            </div>
          ))}
        </div>
        {tip && <div style={st.tip(tip)}>{tip.label}</div>}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════ RENDER ═════
  if (error) return <div style={{ padding:40, textAlign:"center", color:TERRA, fontFamily:SANS }}>{error}</div>;

  const k = data?.kpis as any;

  const trendTotals = (data?.trend ?? []).reduce((acc: any, b: any) => {
    acc.purchased += dec(b.purchased ?? b.purchase ?? b.in ?? 0);
    acc.consumed  += dec(b.consumed  ?? b.consumption ?? b.out ?? 0);
    acc.wastage   += dec(b.wastage   ?? 0);
    return acc;
  }, { purchased:0, consumed:0, wastage:0 });
  const totalPurchased = dec(k?.purchaseValue    ?? k?.totalPurchased) || trendTotals.purchased;
  const totalConsumed  = dec(k?.consumptionValue ?? k?.totalConsumed)  || trendTotals.consumed;
  const totalWastage   = dec(k?.wastageValue     ?? k?.totalWastage)   || trendTotals.wastage;

  const lowCount = k?.lowCount ?? k?.lowStockCount ?? 0;
  const outCount = k?.outCount ?? k?.outOfStockCount ?? 0;

  const lowItems = data?.lowItems ?? [];
  const alertHead = lowItems.slice(0, 3);
  const alertRest = lowItems.length - alertHead.length;

  return (
    <div style={st.wrap}>
      <style>{`
        @keyframes inv-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div style={st.kpiRow}>
        {[
          { label:"Stock value",    val: loading?null:rfmt(dec(k?.stockValue)),  sub:"At cost price (now)", accent:TERRA },
          { label:"Purchased",      val: loading?null:rfmt(totalPurchased),      sub:kpiSub,                accent:GREEN },
          { label:"Consumed",       val: loading?null:rfmt(totalConsumed),       sub:kpiSub,                accent:AMBER },
          { label:"Wastage",        val: loading?null:rfmt(totalWastage),        sub:kpiSub,                accent:MUTE  },
          { label:"Low stock",      val: loading?null:String(lowCount),          sub:"At or below reorder", accent:lowCount>0?AMBER:MUTE },
          { label:"Out of stock",   val: loading?null:String(outCount),          sub:"Needs restocking",    accent:outCount>0?RED:MUTE   },
        ].map(kc => (
          <div key={kc.label} style={st.kpiCard}>
            <div style={st.kpiLabel}>{kc.label}</div>
            {kc.val === null
              ? <Skel h={20}/>
              : <div style={{ fontSize:17, fontWeight:800, color:kc.accent, fontVariantNumeric:"tabular-nums", lineHeight:1.15, overflowWrap:"anywhere" }}>{kc.val}</div>}
            <div style={st.kpiSub}>{kc.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Alert strip ────────────────────────────────────────────────────── */}
      {!loading && lowItems.length > 0 && (
        <div style={st.alertStrip}>
          <span style={{ fontWeight:700, color:AMBER, flexShrink:0 }}>⚠ Restock —</span>
          <span style={{ color:BODY, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {alertHead.map((it,i) => (
              <span key={it.id}>{i>0?", ":""}<b>{it.name}</b> ({dec(it.quantity)}/{dec(it.reorderLevel)} {it.unit})</span>
            ))}
            {alertRest > 0 && <span style={{ color:MUTE }}> +{alertRest} more</span>}
          </span>
        </div>
      )}

      {/* ── Charts row: stock flow · category share ────────────────────────── */}
      <div style={st.grid2}>
        <div style={st.chartCard}>
          <div style={st.chartHead}>
            <div style={st.chartTitle}>Stock flow</div>
            <div style={st.chartSub}>{rangeLabel} · by {gran}</div>
          </div>
          {loading ? <Skel h={BAR_H}/> : <>{renderTrend()}{renderFlowSummary()}</>}
        </div>

        <div style={st.chartCard}>
          <div style={st.chartHead}>
            <div style={st.chartTitle}>Value by category</div>
            <div style={st.chartSub}>At cost price (current stock)</div>
          </div>
          {loading ? <Skel h={140}/> : renderCategories()}
        </div>
      </div>

      {/* ── Top items + Low stock ───────────────────────────────────────────── */}
      <div style={st.grid2}>
        <div style={st.chartCard}>
          <div style={st.chartHead}>
            <div style={st.chartTitle}>Stock health</div>
            <div style={st.chartSub}>Items by reorder status</div>
          </div>
          {loading ? <Skel h={140}/> : renderHealth()}
        </div>

        <div style={st.chartCard}>
          <div style={st.chartHead}>
            <div style={st.chartTitle}>Needs restocking</div>
            <div style={st.chartSub}>At or below reorder level</div>
          </div>
          {loading ? <Skel h={110}/> : (
            lowItems.length === 0
              ? <div style={st.chartEmpty}>All items are well stocked.</div>
              : <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {lowItems.map(it => {
                    const isOut = dec(it.quantity) <= 0;
                    return (
                      <div key={it.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"7px 10px", background:isOut?"#fbeae7":"#fbf1dd", border:`1px solid ${isOut?SOFT.red+"77":SOFT.amber+"88"}` }}>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:12, color:INK, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{it.name}</div>
                          <div style={{ fontSize:10.5, color:MUTE }}>{it.category || "—"}</div>
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontWeight:800, fontSize:12, color:isOut?RED:AMBER, fontVariantNumeric:"tabular-nums" }}>{dec(it.quantity)} {it.unit}</div>
                          <div style={{ fontSize:10, color:MUTE }}>reorder at {dec(it.reorderLevel)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
          )}
        </div>
      </div>

      {/* ── Recent activity ─────────────────────────────────────────────────── */}
      <div style={st.chartCard}>
        <div style={st.chartHead}>
          <div style={st.chartTitle}>Recent stock activity</div>
          <div style={st.chartSub}>Last 12 movements</div>
        </div>
        {loading ? <Skel h={110}/> : (
          (data?.recent?.length ?? 0) === 0
            ? <div style={st.chartEmpty}>No movements recorded yet.</div>
            : <div style={{ overflowX:"auto" }}>
                <table style={st.table}>
                  <thead>
                    <tr>{["Item","Type","Change","Balance","Note","Date"].map(h=>(
                      <th key={h} style={st.th}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {data!.recent.map((mv,i) => {
                      const sign  = MOV_SIGN[mv.type] ?? 1;
                      const color = MOV_COLOR[mv.type] ?? MUTE;
                      const unit  = moveUnit(mv);
                      return (
                        <tr key={mv.id} style={{ background:i%2===0?CARD:IVORY }}>
                          <td style={st.td}><span style={{ fontWeight:600, color:INK }}>{moveItemName(mv)}</span></td>
                          <td style={st.td}><span style={{ ...st.pill, background:`${color}18`, color }}>{MOV_LABEL[mv.type]||mv.type}</span></td>
                          <td style={{ ...st.td, fontWeight:700, color:sign>0?GREEN:TERRA, fontVariantNumeric:"tabular-nums", whiteSpace:"nowrap" }}>
                            {sign>0?"+":"-"}{Math.abs(mv.delta)}{unit?` ${unit}`:""}
                          </td>
                          <td style={{ ...st.td, fontVariantNumeric:"tabular-nums", color:BODY }}>{dec(mv.postBalance).toFixed(2)}</td>
                          <td style={{ ...st.td, color:MUTE, fontSize:11.5, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{mv.note||mv.supplierName||mv.invoiceNo||"—"}</td>
                          <td style={{ ...st.td, color:MUTE, fontSize:11, whiteSpace:"nowrap" }}>{dtfmt(mv.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const st: Record<string, any> = {
  wrap:       { padding:"14px 16px 28px", display:"flex", flexDirection:"column", gap:12, fontFamily:SANS },

  kpiRow:     { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(126px,1fr))", gap:9 },
  kpiCard:    { padding:"10px 12px", border:`1px solid ${LINE}`, background:CARD, borderRadius:0, minWidth:0 },
  kpiLabel:   { fontSize:9.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.7, marginBottom:5 },
  kpiSub:     { fontSize:10, color:MUTE, marginTop:3 },

  alertStrip: { padding:"7px 12px", background:"#fbf1dd", border:"1px solid #d9a44166", fontSize:12, display:"flex", gap:6, alignItems:"center", minWidth:0 },

  // stretch (not start) so paired cards share a height and their bottom
  // borders land on the same line instead of one ending short
  grid2:      { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12, alignItems:"stretch" },
  chartCard:  { background:CARD, border:`1px solid ${LINE}`, padding:"12px 14px", minWidth:0 },
  chartHead:  { marginBottom:10 },
  chartTitle: { fontSize:12.5, fontWeight:800, color:INK },
  chartSub:   { fontSize:10.5, color:MUTE, marginTop:1 },
  chartEmpty: { padding:"18px 0", textAlign:"center", color:MUTE, fontSize:12 },

  catTotal:   { display:"flex", justifyContent:"space-between", alignItems:"baseline", fontSize:11.5, paddingBottom:8, marginBottom:9, borderBottom:`1px solid ${LINE}` },

  table:      { width:"100%", borderCollapse:"collapse", fontSize:12 },
  th:         { padding:"7px 10px", textAlign:"left", fontSize:9.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.7, borderBottom:`1.5px solid ${LINE}`, background:IVORY, whiteSpace:"nowrap" },
  td:         { padding:"7px 10px", borderBottom:`1px solid ${LINE}`, verticalAlign:"middle" },
  pill:       { display:"inline-block", padding:"2px 7px", fontSize:10, fontWeight:700, borderRadius:2, whiteSpace:"nowrap" },

  tip: (t: Tip): React.CSSProperties => ({
    position:"fixed", left:t.x+12, top:t.y-10, background:INK, color:"#fff",
    fontSize:11, padding:"5px 9px", borderRadius:3, pointerEvents:"none",
    zIndex:999, whiteSpace:"pre",
  }),
};