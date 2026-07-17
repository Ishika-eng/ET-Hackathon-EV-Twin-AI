import { useEffect, useRef, useState } from "react";

/** Fades + slides children up once they scroll into view -- backed by
 * IntersectionObserver where available, with a hard setTimeout fallback so
 * content never gets stuck invisible in environments where IO doesn't fire
 * (some embedded/automated browser contexts throttle or never invoke it). */
export function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    let fallback;
    let observer;

    const show = () => setVisible(true);

    if (el && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            show();
            observer.disconnect();
          }
        },
        { threshold: 0.15 }
      );
      observer.observe(el);
    } else {
      show();
    }

    // safety net: if IO never fires (throttled background tab, unsupported
    // environment, etc.) reveal anyway after a short delay rather than
    // leaving content permanently invisible
    fallback = setTimeout(show, 1200 + delay);

    return () => {
      observer?.disconnect();
      clearTimeout(fallback);
    };
    // delay is a static per-instance prop (never changes after mount), so
    // it's read via closure rather than listed as a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Counts up from 0 to `value` once visible (IntersectionObserver-backed,
 * same fallback-on-timeout safety net as Reveal above). */
export function CountUp({ value, duration = 1200, suffix = "", prefix = "" }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  const numeric = parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
  const isDecimal = String(value).includes(".");

  useEffect(() => {
    const el = ref.current;
    let fallback;
    let observer;

    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const startTime = performance.now();
      const tick = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(numeric * eased);
        if (progress < 1) requestAnimationFrame(tick);
        else setDisplay(numeric);
      };
      requestAnimationFrame(tick);
    };

    if (el && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            start();
            observer.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(el);
    }

    fallback = setTimeout(start, 1200);

    return () => {
      observer?.disconnect();
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = isDecimal ? display.toFixed(1) : Math.round(display);
  return (
    <span ref={ref}>
      {prefix}{shown}{suffix}
    </span>
  );
}
