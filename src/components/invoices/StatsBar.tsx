// src/components/invoices/StatsBar.tsx
import { INK, MUTE, TERRA, GREEN, METHOD_META, PERIOD_OPTIONS, PERIOD_LABEL, Period, SANS, LINE, CARD, BODY } from "./types";
import Icon from "./Icon";

interface Props {
  count: number; billed: number; received: number;
  outstanding: number; cash: number; online: number;
  // kept in the props so the parent contract is unchanged — the period is now
  // shown by the dropdown in the page's control bar, not repeated here
  period: Period; onPeriodChange: (p: Period) => void;
}

export default function StatsBar({ count, billed, received, outstanding, cash, online }: Props) {
  const rupee = (v: number) => "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div style={st.wrap}>
      {[
        { n: count,             l: "Invoices",        c: INK,                   icon: undefined  },
        { n: rupee(billed),     l: "Total billed",    c: INK,                   icon: undefined  },
        { n: rupee(received),   l: "Received",        c: GREEN,                 icon: undefined  },
        { n: rupee(cash),       l: "Cash received",   c: METHOD_META.cash.fg,   icon: "banknote" },
        { n: rupee(online),     l: "Online received", c: METHOD_META.online.fg, icon: "card"     },
        { n: rupee(outstanding),l: "Outstanding",     c: TERRA,                 icon: undefined  },
      ].map((s, i) => (
        <div key={i} className="ivh-card" style={st.card}>
          <div style={{ fontSize:18, fontWeight:800, lineHeight:1.15, fontVariantNumeric:"tabular-nums", overflowWrap:"anywhere", color: s.c }}>{s.n}</div>
          <div style={{ fontSize:11, color:MUTE, marginTop:4, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            {s.icon && <span style={{ display:"inline-flex", color:"#b6bac3" }}><Icon name={s.icon} size={11} /></span>}
            {s.l}
          </div>
        </div>
      ))}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(132px, 1fr))", gap:10, marginBottom:14 },
  card: { borderRadius:0, padding:"11px 13px", minWidth:0 },
};