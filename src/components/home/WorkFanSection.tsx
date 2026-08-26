import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import '../../styles/fan.css';

/* Labels for the four gallery files whose names describe their
   contents, plus one placeholder. Rename freely - these are the
   only strings that need checking against the actual photos. */
const WORK = [
  { label: 'Restaurant menu cards', img: '/images/gallery/resturant_card.jpeg' },
  { label: 'Printed cups', img: '/images/gallery/papercup.jpeg' },
  { label: 'Awards and trophies', img: '/images/gallery/award.jpeg' },
  { label: 'Volunteer ID cards', img: '/images/gallery/volunteer_id_card.jpeg' },
  { label: 'Recent work', img: '/images/gallery/work_6.jpeg' },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/* Fan geometry: each step away from the active card adds this much
   rotation and horizontal travel, and pushes the card back. */
const STEP_ROTATE = 13;
const STEP_SHIFT = 62;
const STEP_DROP = 14;

export default function WorkFanSection() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const open = useInView(stageRef, { once: true, margin: '-120px' });
  const [active, setActive] = useState(Math.floor(WORK.length / 2));

  return (
    <section className="ap-sec ap-sec--warm">
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
              <span>Our work</span>
            </motion.div>

            <motion.h2
              className="ap-h2"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
            >
              Countless occasions
            </motion.h2>
            <p className="ap-sub">
              Twenty&#8209;five years of jobs that went out the door on time.
            </p>
          </div>

          <Link className="ap-more" to="/portfolio">
            See the gallery &#8594;
          </Link>
        </div>

        <div className="ap-fan-stage" ref={stageRef}>
          {WORK.map((w, i) => {
            const offset = i - active;
            const depth = Math.abs(offset);

            return (
              <motion.button
                key={w.img}
                type="button"
                className="ap-fan-card"
                aria-label={w.label}
                onClick={() => setActive(i)}
                initial={{ rotate: 0, x: 0, y: 40, opacity: 0, scale: 0.94 }}
                animate={
                  open
                    ? {
                        rotate: offset * STEP_ROTATE,
                        x: offset * STEP_SHIFT,
                        y: depth * STEP_DROP,
                        scale: depth === 0 ? 1 : 0.94,
                        opacity: 1,
                      }
                    : { opacity: 1 }
                }
                transition={{
                  duration: 0.9,
                  delay: open ? depth * 0.07 : 0,
                  ease: EASE,
                }}
                style={{ zIndex: 20 - depth }}
                whileHover={{ scale: depth === 0 ? 1.02 : 0.98 }}
              >
                <img src={w.img} alt={w.label} loading="lazy" decoding="async" />
                <span
                  className="ap-fan-veil"
                  style={{ opacity: depth === 0 ? 0 : Math.min(0.28 + depth * 0.16, 0.7) }}
                />
                {depth === 0 && (
                  <motion.span
                    className="ap-fan-chip"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    {w.label}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="ap-fan-hint">Tap a card to bring it forward</p>
      </div>
    </section>
  );
}
