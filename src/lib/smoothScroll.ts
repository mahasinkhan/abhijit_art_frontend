import Lenis from "lenis";

let instance: Lenis | null = null;
let rafId = 0;

export function initSmoothScroll(): () => void {
  const noop = () => {};
  if (typeof window === "undefined") return noop;
  // native momentum on touch devices already feels right, and reduced-motion users opt out
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return noop;

  instance = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: "vertical",
    gestureOrientation: "vertical",
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 1,
    touchMultiplier: 1.8,
    autoResize: true,
  });

  const raf = (time: number) => {
    if (instance) instance.raf(time);
    rafId = window.requestAnimationFrame(raf);
  };
  rafId = window.requestAnimationFrame(raf);

  return () => {
    window.cancelAnimationFrame(rafId);
    if (instance) instance.destroy();
    instance = null;
  };
}

export function scrollToTopInstant(): void {
  if (instance) {
    instance.scrollTo(0, { immediate: true });
    return;
  }
  window.scrollTo(0, 0);
}

export function scrollToTarget(target: string, offset = -96): void {
  if (instance) {
    instance.scrollTo(target, { offset });
    return;
  }
  const el = document.querySelector(target);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
