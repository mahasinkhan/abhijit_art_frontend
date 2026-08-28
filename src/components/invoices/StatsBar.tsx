// src/components/invoices/StatsBar.tsx
import { INK, MUTE, TERRA, GREEN, METHOD_META, PERIOD_OPTIONS, PERIOD_LABEL, Period, SANS, LINE, CARD, BODY } from "./types";
import Icon from "./Icon";

interface Props {
  count: number; billed: number; received: number;
  outstanding: number; cash: number; online: number;
  period: Period; onPeriodChange: (p: Period) => void;
}

export default function StatsBar({ count, billed, received, outstanding, cash, online, period, onPeriodChange }: Props) {
  const rupee = (v: number) => "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <>
      <div style={st.statsHead}>
        <span style={st.statsPeriod}>Showing <b style={{ color: INK }}>{PERIOD_LABEL[period]}</b></span>
      </div>
      <div style={st.wrap}>
        {[
          { n: count,            l: "Invoices",         c: INK,                 icon: undefined       },
          { n: rupee(billed),    l: "Total billed",     c: INK,                 icon: undefined       },
          { n: rupee(received),  l: "Received",         c: GREEN,               icon: undefined       },
          { n: rupee(cash),      l: "Cash received",    c: METHOD_META.cash.fg, icon: "banknote"      },
          { n: rupee(online),    l: "Online received",  c: METHOD_META.online.fg,icon: "card"         },
          { n: rupee(outstanding),l:"Outstanding",      c: TERRA,               icon: undefined       },
        ].map((s, i) => (
          <div key={i} className="ivh-card" style={st.card}>
            <div style={{ fontSize:22, fontWeight:800, lineHeight:1.1, fontVariantNumeric:"tabular-nums", overflowWrap:"anywhere", color: s.c }}>{s.n}</div>
            <div style={{ fontSize:12, color:MUTE, marginTop:7, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
              {s.icon && <span style={{ display:"inline-flex", color:"#b6bac3" }}><Icon name={s.icon} size={12} /></span>}
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const st: Record<string, React.CSSProperties> = {
  statsHead: { marginBottom:8 },
  statsPeriod: { fontSize:12.5, color:MUTE, fontWeight:600, textTransform:"capitalize" },
  wrap: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(158px, 1fr))", gap:14, marginBottom:18 },
  card: { borderRadius:0, padding:"16px 18px", minWidth:0 },
};