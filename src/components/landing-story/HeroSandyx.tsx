"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

// She arrives a second after the page has finished loading, not after this
// component mounted, so her entrance is not competing with the hero text
// reveal or the first paint of the field.
export default function HeroSandyx() {
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => setShown(true), 1000);
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", arm);
    };
  }, []);

  const hidden = { opacity: 0, scale: 0.6, rotate: 30, y: 18 };

  return (
    <motion.img
      src="/sandyx.png"
      alt=""
      aria-hidden
      draggable={false}
      className="pointer-events-none absolute bottom-[-19px] left-[calc(100%-13px)] z-0 hidden w-[62px] max-w-none select-none sm:block"
      style={{ transformOrigin: "50% 100%" }}
      initial={reduced ? false : hidden}
      animate={shown ? { opacity: 0.88, scale: 1, rotate: 13, y: 0 } : hidden}
      transition={
        reduced ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 14, mass: 0.8 }
      }
    />
  );
}
