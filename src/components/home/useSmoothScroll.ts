import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Mounts Lenis smooth scrolling for as long as the calling component
 * is mounted, then tears it down. Scoped this way so navigating away
 * from the home page restores native scrolling everywhere else.
 *
 * Skipped entirely on touch devices - native momentum scrolling on
 * phones is better than anything JS can impose on it - and whenever
 * the visitor has asked for reduced motion.
 */
export default function useSmoothScroll() {
  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (calm || touch) return;

    const lenis = new Lenis({
      duration: 1.05,
      // Same curve as every transition on the page.
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
}
