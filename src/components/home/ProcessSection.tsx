import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../../styles/flow.css';

const EASE = [0.22, 1, 0.36, 1] as const;

const ico = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

const STEPS = [
  {
    title: 'Send your artwork',
    sub: 'WhatsApp, email or upload. A rough sketch is enough to start.',
    path: (
      <>
        <path d="M4 4h16v12H7l-3 3z" />
        <path d="M8 9h8M8 12h5" />
      </>
    ),
  },
  {
    title: 'We quote',
    sub: 'Price and timeline back to you, usually within the hour.',
    path: (
      <>
        <path d="M12 2v20" />
        <path d="M17 6.5A3.5 3.5 0 0 0 13.5 3h-2a3.5 3.5 0 0 0 0 7h1a3.5 3.5 0 0 1 0 7h-2A3.5 3.5 0 0 1 7 13.5" />
      </>
    ),
  },
  {
    title: 'Proof approved',
    sub: 'We match the colour on a sample before the full run prints.',
    path: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    title: 'On the press',
    sub: 'Your job runs, gets finished, cut and checked.',
    path: (
      <>
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
      </>
    ),
  },
  {
    title: 'Collect or delivered',
    sub: 'Pick up in Berhampore, or we send it out to you.',
    path: (
      <>
        <path d="M3 7h11v10H3z" />
        <path d="M14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17" cy="18" r="1.6" />
      </>
    ),
  },
];

/* Alternating wave through the five step centres, which sit at
   x = 100, 300, 500, 700, 900 in this 1000-wide viewBox. */
const WAVE =
  'M105,43 C205,43 205,89 303,89 C401,89 401,43 500,43 C599,43 599,89 697,89 C795,89 795,43 895,43';

export default function ProcessSection() {
  return (
    <section className="ap-sec">
      <div className="ap-shell">
        <div className="ap-sec-head">
          <div>
            <motion.div
              className="ap-eyebrow"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <i />
              <span>How it works</span>
            </motion.div>

            <motion.h2
              className="ap-h2"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
            >
              From idea to delivery
            </motion.h2>
            <p className="ap-sub">Five steps, no back and forth.</p>
          </div>

          <Link className="ap-more" to="/services">
            Start a job &#8594;
          </Link>
        </div>

        <div className="ap-flow">
          <svg
            className="ap-flow-wave"
            viewBox="0 0 1000 200"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <motion.path
              d={WAVE}
              fill="none"
              stroke="var(--ap-gold)"
              strokeWidth="1.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1.1, ease: EASE }}
            />
          </svg>

          <div className="ap-flow-steps">
            {STEPS.map((s, i) => (
              <motion.div
                className="ap-step"
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.12, ease: EASE }}
              >
                <span className="ap-step-disc">
                  <svg {...ico} aria-hidden="true">{s.path}</svg>
                </span>
                <span className="ap-step-n">{`0${i + 1}`}</span>
                <b>{s.title}</b>
                <span>{s.sub}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
