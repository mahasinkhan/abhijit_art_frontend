import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchHeroSlides, type HeroSlide } from '../../services/hero.api';

type Props = {
  /**
   * Fallback hero photograph, used until an admin adds slides.
   * Must NOT have text baked into it and should be visually quiet
   * on the left, where the headline sits.
   */
  image: string;
  alt?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const AUTOPLAY_MS = 6000;

/* Used whenever a slide leaves a text field blank, so an image-only
   slide still carries the original copy. */
const FALLBACK = {
  alt: 'Printing, signage and branding work by Abhijit Art',
  eyebrow: 'Printing & Branding \u00B7 Berhampore',
  titleTop: 'Crafting quality',
  titleBottom: 'print & signage.',
  subtitle:
    'Visiting cards, flex and LED boards, stickers, t\u2011shirts, name plates and ' +
    'laser cutting \u2014 designed, printed and delivered since 2000.',
};

type View = {
  id: string;
  imageUrl: string;
  alt: string;
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  subtitle: string;
};

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: 0.2 + i * 0.1, ease: EASE },
  }),
};

export default function HeroSection({ image, alt }: Props) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchHeroSlides()
      .then((rows) => { if (alive) setSlides(rows); })
      .catch(() => { /* API down - the built-in image stays */ });
    return () => { alive = false; };
  }, []);

  const views: View[] = slides.length
    ? slides.map((s) => ({
        id: s.id,
        imageUrl: s.imageUrl,
        alt: s.alt || alt || FALLBACK.alt,
        eyebrow: s.eyebrow || FALLBACK.eyebrow,
        titleTop: s.titleTop || FALLBACK.titleTop,
        titleBottom: s.titleBottom || FALLBACK.titleBottom,
        subtitle: s.subtitle || FALLBACK.subtitle,
      }))
    : [{
        id: 'builtin',
        imageUrl: image,
        alt: alt || FALLBACK.alt,
        eyebrow: FALLBACK.eyebrow,
        titleTop: FALLBACK.titleTop,
        titleBottom: FALLBACK.titleBottom,
        subtitle: FALLBACK.subtitle,
      }];

  const at = Math.min(idx, views.length - 1);
  const active = views[at];

  useEffect(() => {
    if (views.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % views.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [views.length]);

  return (
    <section className="ap-hero">
      <motion.div
        className="ap-hero-frame"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        {views.map((v, i) => (
          <img
            key={v.id}
            className={i === at ? 'ap-hero-img is-on' : 'ap-hero-img'}
            src={v.imageUrl}
            alt={v.alt}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
        <div className="ap-hero-scrim" />

        <div className="ap-hero-inner" key={active.id}>
          <motion.div
            className="ap-hero-eyebrow"
            variants={rise}
            custom={0}
            initial="hidden"
            animate="show"
          >
            <i />
            <span>{active.eyebrow}</span>
          </motion.div>

          <h1 className="ap-hero-title">
            <motion.span variants={rise} custom={1} initial="hidden" animate="show">
              {active.titleTop}
            </motion.span>
            <motion.span variants={rise} custom={2} initial="hidden" animate="show">
              <em>{active.titleBottom}</em>
            </motion.span>
          </h1>

          <motion.p
            className="ap-hero-copy"
            variants={rise}
            custom={3}
            initial="hidden"
            animate="show"
          >
            {active.subtitle}
          </motion.p>

          <motion.div
            className="ap-hero-actions"
            variants={rise}
            custom={4}
            initial="hidden"
            animate="show"
          >
            <Link className="ap-cta" to="/services">
              Explore services &#8594;
            </Link>
            <Link className="ap-cta ap-cta--ghost" to="/services">
              Upload your design
            </Link>
          </motion.div>
        </div>

        {views.length > 1 && (
          <div className="ap-hero-dots">
            {views.map((v, i) => (
              <button
                key={v.id}
                type="button"
                className={i === at ? 'on' : ''}
                aria-label={'Show hero slide ' + (i + 1)}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
