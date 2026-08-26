import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../../styles/sections.css';

/* Ten real service photographs already in public/images/home/services. */
const SERVICES = [
  { name: 'Flex Printing', img: 'flex.jpeg' },
  { name: 'Digital Printing', img: 'digital_printing.jpeg' },
  { name: 'Visiting Cards', img: 'visiting-card.jpeg' },
  { name: 'Laser Cutting', img: 'laser_cutting.jpeg' },
  { name: 'LED Modules', img: 'led-module.jpeg' },
  { name: 'Acrylic Boards', img: 'acrylic-board.jpeg' },
  { name: 'Sticker Cutting', img: 'sticker.jpeg' },
  { name: 'PVC Cards', img: 'pvc-card.jpeg' },
  { name: 'Cup Printing', img: 'cup.jpeg' },
  { name: 'Stamp Making', img: 'stamp.jpeg' },
];

const ico = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

const TRUST = [
  {
    title: 'Same day dispatch',
    sub: 'On stock jobs placed before noon',
    path: <path d="M13 2 3 14h8l-1 8 11-12h-8z" />,
  },
  {
    title: 'Colour matched',
    sub: 'Proofed before the full run prints',
    path: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    title: 'Bulk pricing',
    sub: 'Rates drop as quantity rises',
    path: (
      <>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.3 7 12 12 20.7 7" />
      </>
    ),
  },
  {
    title: 'Design help included',
    sub: 'Send a rough idea, we set the artwork',
    path: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 15 6-6M9 9h.01M15 15h.01" />
      </>
    ),
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ServicesSection() {
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
              <span>What we print</span>
            </motion.div>

            <motion.h2
              className="ap-h2"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
            >
              Ten presses, one counter
            </motion.h2>
            <p className="ap-sub">Everything your brand needs, made under one roof.</p>
          </div>

          <Link className="ap-more" to="/services">
            See all services &#8594;
          </Link>
        </div>

        <div className="ap-rail-wrap">
          <div className="ap-rail">
            {SERVICES.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: Math.min(i, 5) * 0.06, ease: EASE }}
                style={{ flex: '0 0 auto' }}
              >
                <Link className="ap-rail-item" to="/services">
                  <img src={`/images/home/services/${s.img}`} alt={s.name} loading="lazy" decoding="async" />
                  <span className="ap-rail-veil" />
                  <span className="ap-rail-label">
                    <b>{s.name}</b>
                    <i />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="ap-trust">
          {TRUST.map((t, i) => (
            <motion.div
              className="ap-trust-item"
              key={t.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: EASE }}
            >
              <svg {...ico} aria-hidden="true">{t.path}</svg>
              <div>
                <b>{t.title}</b>
                <span>{t.sub}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
