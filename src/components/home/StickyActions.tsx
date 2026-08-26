import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/sticky.css';

/**
 * Fill these in to turn the buttons into real actions. WhatsApp wants
 * international form with no plus or spaces, e.g. '919876543210'.
 * Left empty, each button falls back to an in-app route rather than
 * a dead link.
 */
const WHATSAPP_NUMBER = '';
const PHONE_NUMBER = '';

export default function StickyActions() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Appears once the hero is behind you, not before.
      setShown(window.scrollY > window.innerHeight * 0.75);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          className="ap-sticky"
          initial={{ y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {WHATSAPP_NUMBER ? (
            <a className="ap-cta" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          ) : (
            <Link className="ap-cta" to="/services">
              Get a quote
            </Link>
          )}

          {PHONE_NUMBER ? (
            <a className="ap-cta ap-cta--ghost" href={`tel:${PHONE_NUMBER}`}>
              Call the shop
            </a>
          ) : (
            <Link className="ap-cta ap-cta--ghost" to="/about">
              Contact
            </Link>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
