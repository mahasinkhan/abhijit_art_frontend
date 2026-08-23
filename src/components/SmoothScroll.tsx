import { useEffect } from "react";
import { initSmoothScroll } from "../lib/smoothScroll";

export default function SmoothScroll() {
  useEffect(() => initSmoothScroll(), []);
  return null;
}
