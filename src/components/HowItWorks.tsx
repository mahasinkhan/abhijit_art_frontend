import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/* ══════════════════════════════════════════════════════════════
   ABHIJIT ART — How It Works (live / auto-advancing)
   Rose-gold theme (light pink + golden), slower cycle, full-width.
   Drop in at: src/components/HowItWorks.tsx
   ══════════════════════════════════════════════════════════════ */

const INK = "#141419";
const MUTED = "#6c6c78";
const GOLD = "#c2974a";            // golden accent (eyebrow, progress, chevrons)
const PROGRESS = "#caa05a";        // golden connector fill
const RING = "#ec92ad";            // pink pulse ring
const LINE = "#efe2e8";            // soft pink-tinted dashed line
const FILL = "linear-gradient(145deg, #f4a9c4 0%, #cda14f 100%)"; // rose-gold badge
const TODO_BG = "#fbeef2";         // light pink (upcoming)
const TODO_FG = "#dcb0c0";         // muted rose icon (upcoming)
const TODO_TITLE = "#c9aeb6";      // muted rose title (upcoming)

const STEP_MS = 3200; // time each step stays active (slower)

type IcoProps = { size?: number; stroke?: number };
const base = (s: number, w: number) => ({
  width: s, height: s, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: w, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

const FileIcon = ({ size = 30, stroke = 2 }: IcoProps) => (
  <svg {...base(size, stroke)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /><line x1="8" y1="9" x2="10" y2="9" />
  </svg>
);
const CloudUpIcon = ({ size = 30, stroke = 2 }: IcoProps) => (
  <svg {...base(size, stroke)}>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 4 16.25" />
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
  </svg>
);
const ClipCheckIcon = ({ size = 30, stroke = 2 }: IcoProps) => (
  <svg {...base(size, stroke)}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="m9 14 2 2 4-4" />
  </svg>
);
const TruckIcon = ({ size = 30, stroke = 2 }: IcoProps) => (
  <svg {...base(size, stroke)}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" />
  </svg>
);
const CheckIcon = ({ size = 30, stroke = 2.6 }: IcoProps) => (
  <svg {...base(size, stroke)}><polyline points="20 6 9 17 4 12" /></svg>
);
const ChevIcon = ({ size = 15, stroke = 2.4 }: IcoProps) => (
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
        <p style={hw.eyebrow}>HOW IT WORKS</p>
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
                background: active > i ? PROGRESS : "#fff",
                borderColor: active > i ? PROGRESS : LINE,
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
                    background: filled ? FILL : TODO_BG,
                    color: filled ? "#fff" : TODO_FG,
                    boxShadow: stage === "active"
                      ? `0 0 0 9px rgba(236,146,173,.16), 0 16px 34px rgba(202,160,90,.32)`
                      : stage === "done"
                        ? `0 8px 20px rgba(202,160,90,.22)`
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
          background: ${PROGRESS};
          transition: width .8s cubic-bezier(.4,0,.2,1);
        }
        .hw-chev {
          position: absolute; top: 46px; transform: translate(-50%, -50%);
          width: 30px; height: 30px; border-radius: 50%;
          border: 1px solid ${LINE};
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(20,20,25,.06); z-index: 2;
          transition: background .55s ease, color .55s ease, border-color .55s ease;
        }
        .hw-step { position: relative; z-index: 1; text-align: center; padding: 0 12px; min-width: 0; }
        .hw-badge {
          position: relative; width: 92px; height: 92px; border-radius: 50%;
          margin: 0 auto 18px; display: flex; align-items: center; justify-content: center;
          transition: color .55s ease, box-shadow .55s ease, transform .55s cubic-bezier(.2,.8,.2,1);
        }
        .hw-badge.is-active { transform: scale(1.07); }
        .hw-ring {
          position: absolute; inset: 0; border-radius: 50%; border: 2px solid ${RING};
          animation: hwPulse 2.6s cubic-bezier(.4,0,.2,1) infinite;
        }
        @keyframes hwPulse {
          0%   { transform: scale(.92); opacity: .55; }
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
  section: { background: "#ffffff", padding: "84px 0", position: "relative", overflow: "hidden" },
  inner: { maxWidth: 1600, margin: "0 auto", padding: "0 clamp(16px, 3vw, 40px)", textAlign: "center", boxSizing: "border-box" },
  eyebrow: { color: GOLD, fontWeight: 800, letterSpacing: 3, fontSize: 12, margin: "0 0 10px" },
  title: { fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 3.4vw, 38px)", fontWeight: 800, color: INK, margin: 0, letterSpacing: -0.4 },
  stepTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 6px", transition: "color .55s ease" },
  stepSub: { fontSize: 13.5, color: MUTED, lineHeight: 1.55, margin: 0, maxWidth: 190, marginLeft: "auto", marginRight: "auto" },
};