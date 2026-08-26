import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

type Props = {
  /**
   * Full-bleed hero photograph. Must NOT have text baked into it and
   * should be visually quiet on the left, where the headline sits.
   */
  image: string;
  alt?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: 0.2 + i * 0.1, ease: EASE },
  }),
};

export default function HeroSection({ image, alt }: Props) {
  return (
    <section className="ap-hero">
      <motion.div
        className="ap-hero-frame"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <motion.img
          src={image}
          alt={alt ?? 'Printing, signage and branding work by Abhijit Art'}
          loading="eager"
          decoding="async"
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: EASE }}
        />
        <div className="ap-hero-scrim" />

        <div className="ap-hero-inner">
          <motion.div
            className="ap-hero-eyebrow"
            variants={rise}
            custom={0}
            initial="hidden"
            animate="show"
          >
            <i />
            <span>Printing &amp; Branding &middot; Berhampore</span>
          </motion.div>

          <h1 className="ap-hero-title">
            <motion.span variants={rise} custom={1} initial="hidden" animate="show">
              Crafting quality
            </motion.span>
            <motion.span variants={rise} custom={2} initial="hidden" animate="show">
              <em>print &amp; signage.</em>
            </motion.span>
          </h1>

          <motion.p
            className="ap-hero-copy"
            variants={rise}
            custom={3}
            initial="hidden"
            animate="show"
          >
            Visiting cards, flex and LED boards, stickers, t&#8209;shirts, name plates and
            laser cutting &mdash; designed, printed and delivered since 2000.
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
      </motion.div>
    </section>
  );
}
