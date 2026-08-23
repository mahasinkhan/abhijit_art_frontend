import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToTopInstant, scrollToTarget } from "../lib/smoothScroll";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = window.setTimeout(() => scrollToTarget(hash), 60);
      return () => window.clearTimeout(id);
    }
    scrollToTopInstant();
  }, [pathname, hash]);

  return null;
}
