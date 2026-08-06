import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — How It Works (live / auto-advancing)
   Restyled to the About page system: ivory canvas, terracotta =
   the step happening now, gold = steps already done.
   Drop in at: src/components/HowItWorks.tsx
   ══════════════════════════════════════════════════════════════ */

const IVORY = "#f7f3ea";      // page canvas (matches Home hero, seamless join)
const IVORY_2 = "#f2ebdd";    // upcoming-step badge
const CARD = "#fffdf8";
const INK = "#2a231d";
const MUTED = "#7b7167";
const TERRA = "#d9542f";      // current step
const TERRA_DK = "#b23f1e";
const GOLD = "#c2974a";       // completed steps + connector fill
const GOLD_DK = "#a87f38";
const LINE = "#e7dcc8";

const SERIF = "'Fraunces', 'Playfair Display', serif";
const SANS = "'DM Sans', system-ui, sans-serif";

const FILL_ACTIVE = `linear-gradient(145deg, ${TERRA} 0%, ${TERRA_DK} 100%)`;
const FILL_DONE = `linear-gradient(145deg, ${GOLD} 0%, ${GOLD_DK} 100%)`;
const TODO_FG = "#c0b39c";    // muted sand icon (upcoming)
const TODO_TITLE = "#a99c86"; // muted sand title (upcoming)

const STEP_MS = 3200; // time each step stays active

type IcoProps = { size?: number; stroke?: number };
const base = (s: number, w: number) => ({
  width: s, height: s, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

const FileIcon = ({ size = 30, stroke = 1.8 }: IcoProps) => (
  <svg {...base(size, stroke)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /><line x1="8" y1="9" x2="10" y2="9" />
  </svg>
);
const CloudUpIcon = ({ size = 30, stroke = 1.8 }: IcoProps) => (
  <svg {...base(size, stroke)}>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 4 16.25" />
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
  </svg>
);
const ClipCheckIcon = ({ size = 30, stroke = 1.8 }: IcoProps) => (
  <svg {...base(size, stroke)}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);
const TruckIcon = ({ size = 30, stroke = 1.8 }: IcoProps) => (
  <svg {...base(size, stroke)}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
  </svg>
);
const CheckIcon = ({ size = 30, stroke = 2.4 }: IcoProps) => (
  <svg {...base(size, stroke)}><polyline points="20 6 9 17 4 12" /></svg>
);
const ChevIcon = ({ size = 15, stroke = 2.2 }: IcoProps) => (
  <svg {...base(size, stroke)}><polyline points="9 18 15 12 9 6" /></svg>
);

const steps = [
  { title: "Choose Service", sub: "Select the printing service you need", Icon: FileIcon },
  { title: "Upload Design", sub: "Upload your design or requirement", Icon: CloudUpIcon },
  { title: "Confirm Order", sub: "We confirm and start the printing", Icon: ClipCheckIcon },
  { title: "Fast Delivery", sub: "Get your order delivered fast", Icon: TruckIcon },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => clearInterval(t);
  }, []);

  const progress = active / (steps.length - 1);

  return (
    <section style={hw.section}>
      <div style={hw.inner}>
        <p style={hw.eyebrow}>
          <span style={hw.eyeDash} />
          <span>How It Works</span>
        </p>
        <h2 style={hw.title}>From idea to delivery in four simple steps</h2>

        <motion.div
          className="hw-track"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* base + progress connector (desktop) */}
          <span className="hw-line" />
          <span className="hw-progress" style={{ width: `${progress * 75}%` }} />

          {/* chevrons turn gold as the flow passes them */}
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="hw-chev"
              style={{
                left: `${25 + i * 25}%`,
                color: active > i ? "#fff" : GOLD,
                background: active > i ? GOLD : CARD,
                borderColor: active > i ? GOLD : LINE,
              }}
            >
              <ChevIcon />
            </span>
          ))}

          {steps.map((s, i) => {
            const stage = i < active ? "done" : i === active ? "active" : "todo";
            const Icon = stage === "done" ? CheckIcon : s.Icon;
            const filled = stage !== "todo";
            return (
              <div className="hw-step" key={s.title}>
                <div
                  className={`hw-badge ${stage === "active" ? "is-active" : ""}`}
                  style={{
                    background: stage === "active" ? FILL_ACTIVE : stage === "done" ? FILL_DONE : IVORY_2,
                    color: filled ? "#fff" : TODO_FG,
                    border: stage === "todo" ? `1px solid ${LINE}` : "1px solid transparent",
                    boxShadow: stage === "active"
                      ? `0 0 0 9px rgba(217,84,47,.10), 0 16px 34px rgba(217,84,47,.26)`
                      : stage === "done"
                        ? `0 8px 20px rgba(194,151,74,.26)`
                        : "none",
                  }}
                >
                  {stage === "active" && <span className="hw-ring" aria-hidden />}
                  <Icon />
                </div>
                <h3 style={{ ...hw.stepTitle, color: filled ? INK : TODO_TITLE }}>{s.title}</h3>
                <p style={hw.stepSub}>{s.sub}</p>
              </div>
            );
          })}
        </motion.div>
      </div>

      <style>{`
        .hw-track {
          position: relative; display: grid; grid-template-columns: repeat(4, 1fr);
          margin-top: 48px;
        }
        .hw-line {
          position: absolute; top: 46px; left: 12.5%; right: 12.5%; height: 2px; z-index: 0;
          background: repeating-linear-gradient(90deg, ${LINE} 0 6px, transparent 6px 12px);
        }
        .hw-progress {
          position: absolute; top: 45px; left: 12.5%; height: 3px; border-radius: 3px; z-index: 0;
          background: ${GOLD};
          transition: width .8s cubic-bezier(.4,0,.2,1);
        }
        .hw-chev {
          position: absolute; top: 46px; transform: translate(-50%, -50%);
          width: 30px; height: 30px; border-radius: 50%;
          border: 1px solid ${LINE};
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(42,35,29,.07); z-index: 2;
          transition: background .55s ease, color .55s ease, border-color .55s ease;
        }
        .hw-step { position: relative; z-index: 1; text-align: center; padding: 0 12px; min-width: 0; }
        .hw-badge {
          position: relative; width: 92px; height: 92px; border-radius: 50%;
          margin: 0 auto 18px; display: flex; align-items: center; justify-content: center;
          box-sizing: border-box;
          transition: color .55s ease, box-shadow .55s ease, background .55s ease, transform .55s cubic-bezier(.2,.8,.2,1);
        }
        .hw-badge.is-active { transform: scale(1.07); }
        .hw-ring {
          position: absolute; inset: -1px; border-radius: 50%; border: 2px solid ${TERRA};
          animation: hwPulse 2.6s cubic-bezier(.4,0,.2,1) infinite;
        }
        @keyframes hwPulse {
          0%   { transform: scale(.92); opacity: .5; }
          70%  { opacity: 0; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hw-ring { animation: none; }
          .hw-badge, .hw-progress, .hw-chev { transition: none; }
        }

        @media (max-width: 860px) {
          .hw-track { grid-template-columns: repeat(2, 1fr); gap: 40px 16px; }
          .hw-line, .hw-progress, .hw-chev { display: none; }
        }
        @media (max-width: 460px) {
          .hw-track { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}

const hw: Record<string, React.CSSProperties> = {
  section: { background: IVORY, padding: "88px 0", position: "relative", overflow: "hidden", fontFamily: SANS },
  inner: { maxWidth: 1600, margin: "0 auto", padding: "0 clamp(16px, 3vw, 40px)", textAlign: "center", boxSizing: "border-box" },
  eyebrow: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
    color: TERRA, fontFamily: SANS, fontWeight: 700, letterSpacing: 2.6,
    fontSize: 12, textTransform: "uppercase", margin: "0 0 16px",
  },
  eyeDash: { width: 34, height: 2, background: TERRA, borderRadius: 2, display: "block", flexShrink: 0 },
  title: { fontFamily: SERIF, fontSize: "clamp(28px, 3.4vw, 42px)", fontWeight: 700, color: INK, margin: 0, letterSpacing: -0.8, lineHeight: 1.12 },
  stepTitle: { fontFamily: SERIF, fontSize: 19, fontWeight: 700, margin: "0 0 6px", letterSpacing: -0.3, transition: "color .55s ease" },
  stepSub: { fontSize: 13.5, color: MUTED, lineHeight: 1.6, margin: 0, maxWidth: 195, marginLeft: "auto", marginRight: "auto" },
};