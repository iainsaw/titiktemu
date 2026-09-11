import { useRef, useEffect, useState, type ReactNode } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { cn } from "@/lib/utils";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: "fade-in-up" | "fade-in" | "slide-in-right" | "slide-in-left" | "zoom-in";
  delay?: number; // ms
  duration?: number; // ms
}

export function AnimatedSection({
  children,
  className,
  animation = "fade-in-up",
  delay = 0,
  duration = 600, // Tuned down from 700ms: snappier settle (Apple §4: response)
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Trigger slightly before the element is fully in view for a more natural feel
  const isVisible = useIntersectionObserver(ref, {
    threshold: 0.08,
    rootMargin: "-4% 0px",
    freezeOnceVisible: true,
  });

  // Apple §14: Reduced-motion — detect once at mount, skip all transforms
  const [prefersReducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  const getHiddenTransform = () => {
    if (prefersReducedMotion) return ""; // No transform — opacity only
    switch (animation) {
      case "fade-in-up":
        return "translate-y-6 opacity-0";
      case "slide-in-right":
        return "translate-x-6 opacity-0";
      case "slide-in-left":
        return "-translate-x-6 opacity-0";
      case "zoom-in":
        return "scale-[0.96] opacity-0";
      case "fade-in":
      default:
        return "opacity-0";
    }
  };

  return (
    <div
      ref={ref}
      data-animated-section="" // Hook for CSS reduced-motion guard
      className={cn(
        "will-change-transform",
        !isVisible && getHiddenTransform(),
        isVisible && "translate-y-0 translate-x-0 scale-100 opacity-100",
        className,
      )}
      style={{
        /*
         * Guide §5: --ease-out = cubic-bezier(0.23, 1, 0.32, 1).
         * Strong ease-out for entrances — the built-in ease-out is too weak.
         * Reduced-motion path: opacity-only, 200ms ease (gentler, not zero).
         */
        transitionProperty: prefersReducedMotion ? "opacity" : "transform, opacity",
        transitionDuration: prefersReducedMotion ? "200ms" : `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: prefersReducedMotion ? "ease" : "var(--ease-out)",
      }}
    >
      {children}
    </div>
  );
}
