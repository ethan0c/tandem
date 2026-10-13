"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function LandingMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-visible", "true");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08 });

    const showAll = () => {
      if (!preference.matches) return;
      observer.disconnect();
      elements.forEach((element) => element.setAttribute("data-visible", "true"));
    };
    if (!preference.matches) {
      elements.forEach((element) => {
        // Keep the initial viewport visible; reveal later content as it enters.
        if (element.getBoundingClientRect().top < window.innerHeight) return;
        element.setAttribute("data-visible", "false");
        observer.observe(element);
      });
    }
    preference.addEventListener("change", showAll);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", showAll);
      elements.forEach((element) => element.removeAttribute("data-visible"));
    };
  }, []);

  return <div ref={ref} className="landing flex flex-1 flex-col">{children}</div>;
}
