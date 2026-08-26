import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import '../../styles/cta.css';

/**
 * Set this to the shop's WhatsApp number in international form with
 * no plus or spaces, e.g. '919876543210'. Left empty, the primary
 * button falls back to the services route instead of a dead link.
 */
const WHATSAPP_NUMBER = '';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Counts from zero to `to` once the element is on screen. */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const seen = useInView(ref, { once: true, margin: '-60px' });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!seen) return;

    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm) {
      setN(to);
      return;
    }

    let frame = 0;
    const started = performance.now();
    const run = () => {
      const t = Math.min((performance.now() - started) / 1200, 1);
      // easeOutCubic so it decelerates into the final figure
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [seen, to]);

  return (
    <b ref={ref}>
      {n}
      {suffix}
    </b>
  );
}

export default function CtaSection() {
  const primaryTo = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}`
    : '/services';

  return (
    <section className="ap-cta-band">
      <motion.div
        className="ap-cta-inner"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <div className="ap-cta-top">
          <div>
            <div className="ap-cta-eyebrow">
              <i />
              <span>Start a job</span>
            </div>

            <h2 className="ap-cta-title">
              Send us your artwork, <em>we will do the rest.</em>
            </h2>

            <p className="ap-cta-copy">
              A photo of a rough sketch is enough to get a quote. Tell us the size,
              the quantity and when you need it, and we will come back with a price.
            </p>
          </div>

          <div className="ap-cta-actions">
            {WHATSAPP_NUMBER ? (
              <a className="ap-cta" href={primaryTo} target="_blank" rel="noreferrer">
                Message on WhatsApp
              </a>
            ) : (
              <Link className="ap-cta" to={primaryTo}>
                Get a quote
              </Link>
            )}
            <Link className="ap-cta ap-cta--ghost" to="/services">
              Upload your design
            </Link>
          </div>
        </div>

        <div className="ap-stats">
          <div className="ap-stat">
            <CountUp to={25} />
            <span>Years printing in Berhampore</span>
          </div>
          <div className="ap-stat">
            <CountUp to={10} />
            <span>Print and signage services under one roof</span>
          </div>
          <div className="ap-stat">
            <b>Same day</b>
            <span>Dispatch on stock jobs placed before noon</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
