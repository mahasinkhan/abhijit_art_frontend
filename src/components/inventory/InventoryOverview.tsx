// src/components/inventory/InventoryOverview.tsx
// ── Overview tab: filter bar + KPI cards, alert strip, charts, recent activity ──
// Zero npm deps — all charts are hand-drawn SVG. Reads GET /api/inventory/dashboard.

import { useEffect, useState } from "react";
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
  kpis: { totalItems: number; stockValue: string; lowStockCount: number; outOfStockCount: number; totalPurchased: string; totalConsumed: string; totalWastage: string; };
  trend:      TrendBucket[];
  categories: CategoryBucket[];
  topByValue: TopItem[];
  lowItems:   LowItem[];
  recent:     RecentMove[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MOV_COLOR: Record<string,string> = { purchase:GREEN, consumption:TERRA, wastage:AMBER, opening:GOLD, returned:GREEN, adjustment:MUTE };
const MOV_SIGN:  Record<string,number> = { purchase:1, opening:1, returned:1, consumption:-1, wastage:-1, adjustment:1 };
const MOV_LABEL: Record<string,string> = { purchase:"Purchase", consumption:"Consumption", wastage:"Wastage", opening:"Opening", returned:"Return", adjustment:"Adjustment" };
const dtfmt = (s: string) => new Date(s).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});

const fmtD = (s: string) => s ? new Date(s + "T00:00:00").toLocaleDateString("en-IN",{ day:"numeric", month:"short", year:"numeric" }) : "";

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
  const BAR_W = 560; const BAR_H = 160; const BAR_PAD = 40;
  const DON_R  = 70;  const DON_CX = 90; const DON_CY = 90;

  // ── Trend bar chart ─────────────────────────────────────────────────────────
  const renderTrend = () => {
    const raw = data?.trend ?? [];
    const t = raw.map((b: any) => ({
      month:     String(b.month ?? b.label ?? b.period ?? b.date ?? ""),
      purchased: dec(b.purchased ?? b.purchase ?? b.in ?? 0),
      consumed:  dec(b.consumed  ?? b.consumption ?? b.out ?? 0),
      wastage:   dec(b.wastage   ?? 0),
    })).filter(b => b.month);

    if (!t.length) return <div style={st.chartEmpty}>No movement data in this range — record a stock movement to see the trend.</div>;
    const maxV = Math.max(...t.flatMap(b => [b.purchased, b.consumed, b.wastage]), 1);
    const cols  = t.length;
    const slotW = (BAR_W - BAR_PAD * 2) / cols;
    const barW  = Math.max(Math.min(slotW * 0.24, 16), 2);   // 2–16px wide
    const gap   = Math.max(barW * 0.4, 1);
    const scaleH = (v: number) => (v / maxV) * (BAR_H - 24);

    const SERIES = [
      { key:"purchased" as const, color:GREEN,  label:"Purchased" },
      { key:"consumed"  as const, color:TERRA,  label:"Consumed"  },
      { key:"wastage"   as const, color:AMBER,  label:"Wastage"   },
    ];

    return (
      <div style={{ position:"relative" }}>
        <svg width="100%" viewBox={`0 0 ${BAR_W} ${BAR_H + 28}`} style={{ display:"block" }}>
          {[0,.25,.5,.75,1].map(p => (
            <line key={p} x1={BAR_PAD} y1={BAR_H - p*(BAR_H-24)} x2={BAR_W-BAR_PAD} y2={BAR_H - p*(BAR_H-24)}
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
                  fill={s.color} opacity={0.85} rx={1}
                  style={{ cursor:"pointer" }}
                  onMouseEnter={e => setTip({ x:e.clientX, y:e.clientY, label:`${b.month}\n${s.label}: ${rfmt(b[s.key])}` })}
                  onMouseLeave={() => setTip(null)}
                />
              );
            });
          })}
          {t.map((b, i) => {
            const step = Math.max(1, Math.ceil(cols / 12));
            if (i % step !== 0 && i !== cols - 1) return null;   // show ~12 labels max
            return (
              <text key={i} x={BAR_PAD + i * slotW + slotW / 2} y={BAR_H + 16}
                textAnchor="middle" fontSize={9} fill={MUTE}>
                {b.month}
              </text>
            );
          })}
        </svg>
        <div style={{ display:"flex", gap:16, marginTop:8 }}>
          {SERIES.map(s => (
            <div key={s.key} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:BODY }}>
              <div style={{ width:10, height:10, borderRadius:2, background:s.color }}/>
              {s.label}
            </div>
          ))}
        </div>
        {tip && (
          <div style={{ position:"fixed", left:tip.x+12, top:tip.y-10, background:INK, color:"#fff", fontSize:11.5, padding:"6px 10px", borderRadius:3, pointerEvents:"none", zIndex:999, whiteSpace:"pre" }}>
            {tip.label}
          </div>
        )}
      </div>
    );
  };

  // ── Donut chart ─────────────────────────────────────────────────────────────
  const renderDonut = () => {
    const cats = data?.categories ?? [];
    if (!cats.length) return <div style={st.chartEmpty}>No stock data yet.</div>;
    const total = cats.reduce((s,c)=>s+c.value,0) || 1;
    let angle = -Math.PI / 2;
    const slices = cats.map((c, i) => {
      const pct   = c.value / total;
      const sweep = pct * 2 * Math.PI;
      const x1 = DON_CX + DON_R * Math.cos(angle);
      const y1 = DON_CY + DON_R * Math.sin(angle);
      angle += sweep;
      const x2 = DON_CX + DON_R * Math.cos(angle);
      const y2 = DON_CY + DON_R * Math.sin(angle);
      const large = sweep > Math.PI ? 1 : 0;
      return { path:`M ${DON_CX} ${DON_CY} L ${x1} ${y1} A ${DON_R} ${DON_R} 0 ${large} 1 ${x2} ${y2} Z`, color:catColor(i), name:c.name, value:c.value, pct };
    });

    return (
      <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
        <svg width={DON_CX*2} height={DON_CY*2} style={{ flexShrink:0 }}>
          {slices.map((s,i) => (
            <path key={i} d={s.path} fill={s.color} stroke={CARD} strokeWidth={2}
              style={{ cursor:"pointer" }}
              onMouseEnter={e => setTip({ x:e.clientX, y:e.clientY, label:`${s.name}\n${rfmt(s.value)} (${(s.pct*100).toFixed(1)}%)` })}
              onMouseLeave={() => setTip(null)}/>
          ))}
          <circle cx={DON_CX} cy={DON_CY} r={DON_R*0.52} fill={CARD}/>
          <text x={DON_CX} y={DON_CY-4}  textAnchor="middle" fontSize={8.5} fill={MUTE}>Total</text>
          <text x={DON_CX} y={DON_CY+8}  textAnchor="middle" fontSize={10}  fill={INK} fontWeight={700}>{rfmt(total)}</text>
        </svg>
        <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:6 }}>
          {slices.map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12 }}>
              <div style={{ width:9, height:9, borderRadius:2, background:s.color, flexShrink:0 }}/>
              <span style={{ flex:1, color:BODY, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</span>
              <span style={{ color:INK, fontWeight:700, fontVariantNumeric:"tabular-nums", flexShrink:0 }}>{rfmt(s.value)}</span>
            </div>
          ))}
        </div>
        {tip && (
          <div style={{ position:"fixed", left:tip.x+12, top:tip.y-10, background:INK, color:"#fff", fontSize:11.5, padding:"6px 10px", borderRadius:3, pointerEvents:"none", zIndex:999, whiteSpace:"pre" }}>
            {tip.label}
          </div>
        )}
      </div>
    );
  };

  // ── Top items horizontal bar ─────────────────────────────────────────────────
  const renderTopItems = () => {
    const top = data?.topByValue ?? [];
    if (!top.length) return <div style={st.chartEmpty}>No items yet.</div>;
    const maxV = Math.max(...top.map(t=>t.value),1);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {top.map((t,i) => (
          <div key={t.id}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:12 }}>
              <span style={{ color:BODY, fontWeight:600 }}>{t.name}</span>
              <span style={{ color:INK, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{rfmt(t.value)}</span>
            </div>
            <div style={{ height:8, background:LINE, borderRadius:2 }}>
              <div style={{ height:8, borderRadius:2, background:catColor(i), width:`${(t.value/maxV)*100}%`, transition:"width .5s ease" }}/>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════ RENDER ═════
  if (error) return <div style={{ padding:40, textAlign:"center", color:TERRA, fontFamily:SANS }}>{error}</div>;

  const k = data?.kpis as any;

  // Backend returns purchaseValue/consumptionValue/wastageValue; sum the trend as a fallback.
  const trendTotals = (data?.trend ?? []).reduce((acc: any, b: any) => {
    acc.purchased += dec(b.purchased ?? b.purchase ?? b.in ?? 0);
    acc.consumed  += dec(b.consumed  ?? b.consumption ?? b.out ?? 0);
    acc.wastage   += dec(b.wastage   ?? 0);
    return acc;
  }, { purchased:0, consumed:0, wastage:0 });
  const totalPurchased = dec(k?.purchaseValue    ?? k?.totalPurchased) || trendTotals.purchased;
  const totalConsumed  = dec(k?.consumptionValue ?? k?.totalConsumed)  || trendTotals.consumed;
  const totalWastage   = dec(k?.wastageValue     ?? k?.totalWastage)   || trendTotals.wastage;

  return (
    <div style={st.wrap}>
      <style>{`
        @keyframes inv-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div style={st.kpiRow}>
        {[
          { label:"Stock value",    val: loading?null:rfmt(dec(k?.stockValue)),  sub:"At cost price (now)", accent:TERRA,  bg:"#fff2ee" },
          { label:"Total purchased",val: loading?null:rfmt(totalPurchased),      sub:kpiSub,                accent:GREEN,  bg:GREEN_LT  },
          { label:"Total consumed", val: loading?null:rfmt(totalConsumed),       sub:kpiSub,                accent:AMBER,  bg:"#fef3c7" },
          { label:"Wastage",        val: loading?null:rfmt(totalWastage),        sub:kpiSub,                accent:MUTE,   bg:IVORY     },
          { label:"Low stock",      val: loading?null:String(k?.lowStockCount??0),    sub:"At or below reorder", accent:(k?.lowStockCount??0)>0?AMBER:MUTE, bg:(k?.lowStockCount??0)>0?"#fef3c7":IVORY },
          { label:"Out of stock",   val: loading?null:String(k?.outOfStockCount??0),  sub:"Needs restocking",    accent:(k?.outOfStockCount??0)>0?RED:MUTE,  bg:(k?.outOfStockCount??0)>0?RED_LT:IVORY  },
        ].map(kc => (
          <div key={kc.label} style={{ ...st.kpiCard, background:kc.bg, borderColor:`${kc.accent}22` }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, marginBottom:8 }}>{kc.label}</div>
            {kc.val === null
              ? <Skel h={28}/>
              : <div style={{ fontSize:22, fontWeight:900, color:kc.accent, fontVariantNumeric:"tabular-nums", lineHeight:1 }}>{kc.val}</div>}
            <div style={{ fontSize:11, color:MUTE, marginTop:5 }}>{kc.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Alert strip ────────────────────────────────────────────────────── */}
      {!loading && (data?.lowItems?.length ?? 0) > 0 && (
        <div style={st.alertStrip}>
          <span style={{ fontWeight:700, color:AMBER }}>⚠ Restock needed —</span>
          {data!.lowItems.map((it,i) => (
            <span key={it.id} style={{ color:BODY }}>
              {i>0?", ":""}<b>{it.name}</b> ({dec(it.quantity)}/{dec(it.reorderLevel)} {it.unit})
            </span>
          ))}
        </div>
      )}

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div style={st.chartsRow}>
        <div style={{ ...st.chartCard, flex:1.8, minWidth:280 }}>
          <div style={st.chartHead}>
            <div style={st.chartTitle}>Stock flow</div>
            <div style={st.chartSub}>{rangeLabel} · by {gran}</div>
          </div>
          {loading ? <Skel h={BAR_H}/> : renderTrend()}
        </div>

        <div style={{ ...st.chartCard, flex:1, minWidth:220 }}>
          <div style={st.chartHead}>
            <div style={st.chartTitle}>Value by category</div>
            <div style={st.chartSub}>At cost price (current stock)</div>
          </div>
          {loading ? <Skel h={180}/> : renderDonut()}
        </div>
      </div>

      {/* ── Top items + Low stock ───────────────────────────────────────────── */}
      <div style={st.chartsRow}>
        <div style={{ ...st.chartCard, flex:1 }}>
          <div style={st.chartHead}>
            <div style={st.chartTitle}>Top items by value</div>
            <div style={st.chartSub}>Quantity × cost (current stock)</div>
          </div>
          {loading ? <Skel h={120}/> : renderTopItems()}
        </div>

        <div style={{ ...st.chartCard, flex:1 }}>
          <div style={st.chartHead}>
            <div style={st.chartTitle}>Needs restocking</div>
            <div style={st.chartSub}>At or below reorder level</div>
          </div>
          {loading ? <Skel h={120}/> : (
            (data?.lowItems?.length ?? 0) === 0
              ? <div style={st.chartEmpty}>All items are well stocked.</div>
              : <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {data!.lowItems.map(it => {
                    const isOut = dec(it.quantity) <= 0;
                    return (
                      <div key={it.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", background:isOut?RED_LT:"#fef3c7", border:`1px solid ${isOut?RED+"44":AMBER+"44"}` }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:13, color:INK }}>{it.name}</div>
                          <div style={{ fontSize:11, color:MUTE, marginTop:1 }}>{it.category}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontWeight:800, fontSize:13, color:isOut?RED:AMBER, fontVariantNumeric:"tabular-nums" }}>{dec(it.quantity)} {it.unit}</div>
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
        {loading ? <Skel h={120}/> : (
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
                      return (
                        <tr key={mv.id} style={{ background:i%2===0?CARD:IVORY }}>
                          <td style={st.td}><span style={{ fontWeight:600, color:INK }}>{mv.itemName}</span></td>
                          <td style={st.td}><span style={{ ...st.pill, background:`${color}18`, color }}>{MOV_LABEL[mv.type]||mv.type}</span></td>
                          <td style={{ ...st.td, fontWeight:700, color:sign>0?GREEN:TERRA, fontVariantNumeric:"tabular-nums" }}>
                            {sign>0?"+":"-"}{Math.abs(mv.delta)} {mv.itemUnit}
                          </td>
                          <td style={{ ...st.td, fontVariantNumeric:"tabular-nums", color:BODY }}>{dec(mv.postBalance).toFixed(2)}</td>
                          <td style={{ ...st.td, color:MUTE, fontSize:12 }}>{mv.note||mv.supplierName||mv.invoiceNo||"—"}</td>
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
const st: Record<string, React.CSSProperties> = {
  wrap:       { padding:"20px 20px 40px", display:"flex", flexDirection:"column", gap:16, fontFamily:SANS },

  kpiRow:     { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 },
  kpiCard:    { padding:"18px 20px", border:"1px solid", borderRadius:0 },
  alertStrip: { padding:"10px 16px", background:"#fef3c7", border:`1px solid ${AMBER}44`, fontSize:13, display:"flex", flexWrap:"wrap", gap:4, alignItems:"center" },
  chartsRow:  { display:"flex", gap:16, flexWrap:"wrap" },
  chartCard:  { background:CARD, border:`1px solid ${LINE}`, padding:"18px 20px" },
  chartHead:  { marginBottom:16 },
  chartTitle: { fontSize:14, fontWeight:800, color:INK },
  chartSub:   { fontSize:11.5, color:MUTE, marginTop:2 },
  chartEmpty: { padding:"28px 0", textAlign:"center", color:MUTE, fontSize:13 } as React.CSSProperties,
  table:      { width:"100%", borderCollapse:"collapse", fontSize:13 },
  th:         { padding:"9px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:MUTE, textTransform:"uppercase", letterSpacing:.8, borderBottom:`2px solid ${LINE}`, background:IVORY, whiteSpace:"nowrap" },
  td:         { padding:"11px 14px", borderBottom:`1px solid ${LINE}`, verticalAlign:"middle" },
  pill:       { display:"inline-block", padding:"3px 8px", fontSize:11, fontWeight:700, borderRadius:2 },
};