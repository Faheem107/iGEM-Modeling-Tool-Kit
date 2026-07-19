"use client";

/**
 * SandyxAdventure, full-screen interactive story + retro arcade
 * =============================================================
 * Launched when the reader clicks the Sandyx mascot beside "NYUAD iGEM 2026".
 * A near-fullscreen overlay runs a smooth, skippable flow:
 *
 *   intro (Sandyx driving through the city)  ─▶ sandstorm transition
 *   desert (the stakes: WMO/WHO/World-Bank facts, presented by Sandyx)
 *   lab    (80s top-down "Among Us"-style game: walk Sandyx around a lab with
 *           WASD/arrows and complete 5 experiments drawn from Prong 1 & 2)
 *   ─▶ "Proceed to Deployment?"  Yes ─▶ drone deployment game (spray the crust)
 *                                 No  ─▶ tune concentrations, then deploy
 *   drone  ─▶ after ~15s: "Would you like to see how we actually model this?"
 *              Yes ─▶ close + scroll to the Project Overview
 *              No  ─▶ keep flying, with "Proceed to the Model" / "Back to the lab"
 *
 * Everything is code-drawn (framer-motion + canvas). The only art assets are the
 * mascot (`/sandyx.png`) and the top-down car (`/sandyx-car.png`).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, SkipForward } from "lucide-react";
import { Cursor } from "@/components/motion-primitives/cursor";

// ---------------------------------------------------------------------------
// Retro palette
// ---------------------------------------------------------------------------
const C = {
  bg0: "#0b1026",
  bg1: "#161b3d",
  ink: "#e8ecff",
  amber: "#ffcf4d",
  amberDeep: "#ff9d1c",
  teal: "#5be0c8",
  magenta: "#ff5ea8",
  green: "#7cff6b",
  red: "#ff5566",
  purple: "#9b6bff",
  sand: "#e7c98a",
  sandDeep: "#c79b52",
  // Warm light khaki/beige used for Sandyx's dialogue text on dark boxes.
  speech: "#f2ddb0",
};

type Phase =
  "intro" | "storm" | "desert" | "lab" | "deploy-prompt" | "lab-tune" | "drone";

export interface SandyxAdventureProps {
  open: boolean;
  onClose: () => void;
  /** "See how we actually model this" → close overlay and scroll to Project Overview. */
  onSeeModel: () => void;
  /** "Proceed to the Model" → jump into the prong-tailored simulation workspace. */
  onProceedToModel: () => void;
}

// ===========================================================================
// Shared retro UI atoms
// ===========================================================================
function RetroButton({
  children,
  onClick,
  tone = "amber",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "amber" | "teal" | "magenta" | "ghost";
  className?: string;
}) {
  const tones: Record<string, string> = {
    amber: "bg-[#ffcf4d] text-[#2a1e00] border-[#7a5b00] hover:bg-[#ffe08a]",
    teal: "bg-[#5be0c8] text-[#053029] border-[#12655a] hover:bg-[#8ff0e0]",
    magenta: "bg-[#ff5ea8] text-[#3a0020] border-[#7a1247] hover:bg-[#ff8bc2]",
    ghost: "bg-transparent text-[#e8ecff] border-[#4a5290] hover:bg-white/10",
  };
  return (
    <button
      onClick={onClick}
      className={`btn-colored font-retro text-[11px] sm:text-[13px] px-5 py-4 border-[3px] transition-colors duration-150 active:translate-y-[2px] ${tones[tone]} ${className}`}
      style={{ boxShadow: "5px 5px 0 rgba(0,0,0,0.5)" }}
    >
      {children}
    </button>
  );
}

/** 80s pop-up window with a title bar. */
function RetroModal({
  title,
  children,
  accent = C.amber,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.7, opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="w-full max-w-lg"
      style={{ boxShadow: "12px 12px 0 rgba(0,0,0,0.55)" }}
    >
      <div
        className="border-4"
        style={{ borderColor: accent, background: C.bg1 }}
      >
        <div
          className="font-retro text-[12px] px-4 py-3 flex items-center gap-2"
          style={{ background: accent, color: "#1a1200", textShadow: "none" }}
        >
          <span
            className="inline-block w-2.5 h-2.5"
            style={{ background: "#1a1200" }}
          />
          {title}
        </div>
        <div className="p-8">{children}</div>
      </div>
    </motion.div>
  );
}

/** Typewriter speech bubble anchored near Sandyx. */
function SpeechBubble({
  text,
  onDone,
  accent = C.amber,
  className = "",
}: {
  text: string;
  onDone?: () => void;
  accent?: string;
  className?: string;
}) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, 22);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -10 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`relative w-full max-w-2xl ${className}`}
    >
      <div
        className="relative border-4 px-6 py-6 sm:px-8 sm:py-7"
        style={{
          borderColor: accent,
          background: "rgba(9,13,32,0.95)",
          boxShadow: `0 0 22px ${accent}55, 8px 8px 0 rgba(0,0,0,0.55)`,
        }}
      >
        <div
          className="font-retro text-[13px] sm:text-[16px] leading-[1.95]"
          style={{ color: C.speech }}
        >
          {shown}
          <span className="retro-blink" style={{ color: accent }}>
            ▌
          </span>
        </div>
        {/* tail */}
        <div
          className="absolute -bottom-3 left-12 w-5 h-5 rotate-45 border-b-4 border-r-4"
          style={{ borderColor: accent, background: "rgba(9,13,32,0.95)" }}
        />
      </div>
    </motion.div>
  );
}

// ===========================================================================
// Touch controls (mobile)
// ===========================================================================
/** True on coarse-pointer / no-hover devices (phones, most tablets). */
function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const update = () => setTouch(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return touch;
}

/**
 * On-screen D-pad that drives the same key ref the keyboard handlers use, so every
 * game becomes touch-playable with no change to its movement loop. An optional
 * round action button (e.g. the drone's SPRAY) sits on the opposite thumb.
 */
function TouchDpad({
  keysRef,
  onFirstMove,
  action,
}: {
  keysRef: React.MutableRefObject<Record<string, boolean>>;
  onFirstMove?: () => void;
  action?: { label: string; keyName: string; color: string };
}) {
  const hold = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      keysRef.current[k] = true;
      onFirstMove?.();
    },
    onPointerUp: () => {
      keysRef.current[k] = false;
    },
    onPointerLeave: () => {
      keysRef.current[k] = false;
    },
    onPointerCancel: () => {
      keysRef.current[k] = false;
    },
    onLostPointerCapture: () => {
      keysRef.current[k] = false;
    },
  });
  const dBtn =
    "select-none flex items-center justify-center font-retro text-[15px] w-14 h-14 border-[3px] active:translate-y-[1px]";
  const dStyle = {
    borderColor: C.amber,
    color: C.amber,
    background: "rgba(9,13,32,0.8)",
    touchAction: "none" as const,
  };
  return (
    <>
      <div
        className="absolute bottom-4 left-4 z-[66] select-none"
        style={{ touchAction: "none" }}
      >
        <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
          <span />
          <button className={dBtn} style={dStyle} {...hold("arrowup")}>
            ▲
          </button>
          <span />
          <button className={dBtn} style={dStyle} {...hold("arrowleft")}>
            ◀
          </button>
          <span />
          <button className={dBtn} style={dStyle} {...hold("arrowright")}>
            ▶
          </button>
          <span />
          <button className={dBtn} style={dStyle} {...hold("arrowdown")}>
            ▼
          </button>
          <span />
        </div>
      </div>
      {action && (
        <div
          className="absolute bottom-8 right-6 z-[66] select-none"
          style={{ touchAction: "none" }}
        >
          <button
            className="select-none font-retro text-[11px] w-20 h-20 rounded-full border-[3px] active:translate-y-[1px] flex items-center justify-center text-center leading-tight px-2"
            style={{
              borderColor: action.color,
              color: action.color,
              background: "rgba(9,13,32,0.8)",
              touchAction: "none",
            }}
            {...hold(action.keyName)}
          >
            {action.label}
          </button>
        </div>
      )}
    </>
  );
}

// ===========================================================================
// SCENE 1, Intro: Sandyx drives UP a road, city blocks scroll past on both sides
// ===========================================================================

// A single top-down city block: a building, a park, or a plaza.
function CityTile({
  type,
  tint,
}: {
  type: "bldg" | "park" | "plaza";
  tint: string;
}) {
  if (type === "park") {
    return (
      <div style={{ height: 150 }} className="relative w-full">
        <div className="absolute inset-0" style={{ background: "#3f6b34" }} />
        {/* footpath */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0"
          style={{ width: 14, background: "#c9b98a" }}
        />
        {/* trees */}
        {[
          [18, 24],
          [70, 60],
          [30, 108],
          [78, 128],
          [50, 20],
        ].map(([l, t], i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${l}%`,
              top: t,
              width: 26,
              height: 26,
              background: "#2f5326",
              boxShadow: "inset -3px -3px 0 rgba(0,0,0,0.25)",
            }}
          />
        ))}
      </div>
    );
  }
  if (type === "plaza") {
    return (
      <div style={{ height: 150 }} className="relative w-full">
        <div className="absolute inset-0" style={{ background: "#6b6580" }} />
        <div
          className="absolute inset-3 border-2"
          style={{ borderColor: "rgba(255,255,255,0.25)" }}
        />
        {/* parked cars */}
        {[20, 55, 90].map((t, i) => (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              right: 12,
              top: t,
              width: 22,
              height: 34,
              background: ["#c85a5a", "#5a8fc8", "#e0c24d"][i],
            }}
          />
        ))}
      </div>
    );
  }
  // building (top-down roof)
  return (
    <div style={{ height: 150 }} className="relative w-full">
      <div className="absolute inset-0" style={{ background: "#4a4560" }} />
      <div
        className="absolute inset-x-3 inset-y-3 rounded-sm"
        style={{
          background: tint,
          boxShadow: "inset 0 0 0 3px rgba(0,0,0,0.2)",
        }}
      >
        {/* rooftop detail: vents + AC + a skylight */}
        <div className="absolute inset-3 grid grid-cols-3 grid-rows-3 gap-1.5 opacity-80">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              style={{
                background:
                  i % 2 === 0 ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.14)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// A vertical strip of city blocks that scrolls downward (car appears to drive up).
function CityColumn({ side, dur }: { side: "l" | "r"; dur: number }) {
  const tiles: ("bldg" | "park" | "plaza")[] =
    side === "l"
      ? ["bldg", "park", "bldg", "plaza", "bldg", "park"]
      : ["park", "bldg", "plaza", "bldg", "park", "bldg"];
  const tints = [
    "#8a6d9c",
    "#6d7fa0",
    "#9c7d6d",
    "#7a8f6d",
    "#a06d84",
    "#6d95a0",
  ];
  const Copy = () => (
    <div className="flex flex-col">
      {tiles.map((t, i) => (
        <CityTile
          key={i}
          type={t}
          tint={tints[(i + (side === "r" ? 3 : 0)) % tints.length]}
        />
      ))}
    </div>
  );
  return (
    <div
      className="absolute top-0 bottom-0 overflow-hidden"
      style={
        side === "l" ? { left: 0, width: "31%" } : { right: 0, width: "31%" }
      }
    >
      <motion.div
        className="absolute inset-x-0 top-0"
        animate={{ y: ["-50%", "0%"] }}
        transition={{ duration: dur, repeat: Infinity, ease: "linear" }}
      >
        <Copy />
        <Copy />
      </motion.div>
    </div>
  );
}

function IntroScene({
  onFinish,
  isTouch,
}: {
  onFinish: () => void;
  isTouch: boolean;
}) {
  const [stage, setStage] = useState<"drive" | "storm">("drive");
  const [moved, setMoved] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLImageElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const off = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);

  useEffect(() => {
    // Let the reader drive for a bit, then the storm rolls in from the top and hands off.
    const toStorm = setTimeout(() => setStage("storm"), 6000);
    const toDesert = setTimeout(onFinish, 9000);
    return () => {
      clearTimeout(toStorm);
      clearTimeout(toDesert);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard control for the car.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.includes(k)) {
        e.preventDefault();
        keys.current[k] = true;
        if (!movedRef.current) {
          movedRef.current = true;
          setMoved(true);
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Drive loop, WASD/arrows nudge the car; it idles with a gentle bob otherwise.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      let vx = 0,
        vy = 0;
      if (keys.current["a"] || keys.current["arrowleft"]) vx -= 1;
      if (keys.current["d"] || keys.current["arrowright"]) vx += 1;
      if (keys.current["w"] || keys.current["arrowup"]) vy -= 1;
      if (keys.current["s"] || keys.current["arrowdown"]) vy += 1;
      const spd = 300;
      if (vx || vy) {
        const m = Math.hypot(vx, vy) || 1;
        off.current.x += (vx / m) * spd * dt;
        off.current.y += (vy / m) * spd * dt;
      }
      const w = wrapRef.current?.clientWidth || 1000;
      const h = wrapRef.current?.clientHeight || 600;
      const maxX = w * 0.44,
        maxY = h * 0.4;
      off.current.x = Math.max(-maxX, Math.min(maxX, off.current.x));
      off.current.y = Math.max(-maxY, Math.min(maxY, off.current.y));
      const bob = Math.sin(t / 300) * 3;
      if (carRef.current) {
        carRef.current.style.transform = `translate(-50%,-50%) translate(${off.current.x}px, ${off.current.y + bob}px) rotate(${vx * 3}deg)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: "#3a3550" }}
    >
      {/* City blocks scrolling down the left & right */}
      <CityColumn side="l" dur={5.5} />
      <CityColumn side="r" dur={5.5} />

      {/* Central ROAD */}
      <div
        className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: "38%",
          background: "#2b2733",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* sidewalk edges */}
        <div
          className="absolute top-0 bottom-0 left-0 w-2"
          style={{ background: "#5b5668" }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 w-2"
          style={{ background: "#5b5668" }}
        />
        {/* center dashed line scrolling downward */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center gap-8"
          style={{ height: "200%" }}
          animate={{ y: ["-50%", "0%"] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: 32 }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 44,
                background: "#ffcf4d",
                borderRadius: 2,
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* The car, player-driven with WASD / arrows */}
      <img
        ref={carRef}
        src="/sandyx-car.png"
        alt="Sandyx driving"
        draggable={false}
        className="absolute pixelated z-10"
        style={{
          width: 128,
          left: "50%",
          top: "48%",
          transform: "translate(-50%,-50%)",
          filter: "drop-shadow(0 14px 18px rgba(0,0,0,0.55))",
          willChange: "transform",
        }}
      />

      {/* Speech */}
      <AnimatePresence>
        {stage === "drive" && (
          <div className="absolute left-1/2 -translate-x-1/2 top-[7%] w-[92%] max-w-2xl flex justify-center z-20">
            <SpeechBubble
              text="Hey! I'm Sandyx, from the NYU Abu Dhabi iGEM team!"
              accent={C.teal}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Drive hint, disappears after the first key press */}
      <AnimatePresence>
        {!moved && stage === "drive" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 border-[3px] px-5 py-3"
            style={{
              borderColor: C.amber,
              background: "rgba(9,13,32,0.92)",
              boxShadow: "5px 5px 0 rgba(0,0,0,0.5)",
            }}
          >
            <div className="font-retro text-[10px]" style={{ color: C.amber }}>
              {isTouch ? "USE THE PAD TO DRIVE!" : "USE WASD / ARROW KEYS TO DRIVE!"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touch D-pad */}
      {isTouch && stage === "drive" && (
        <TouchDpad
          keysRef={keys}
          onFirstMove={() => {
            if (!movedRef.current) {
              movedRef.current = true;
              setMoved(true);
            }
          }}
        />
      )}

      {/* Sandstorm, rolls DOWN from the top of the screen */}
      <AnimatePresence>
        {stage === "storm" && (
          <motion.div
            className="absolute inset-0 z-30"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
          >
            {/* descending dust wall */}
            <motion.div
              className="absolute left-0 right-0 top-0"
              style={{
                height: "160%",
                background:
                  "linear-gradient(180deg, rgba(150,120,74,0.98) 0%, rgba(190,156,102,0.9) 45%, rgba(214,182,120,0.6) 78%, transparent 100%)",
              }}
              initial={{ y: "-160%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 2.8, ease: "easeIn" }}
            />
            {/* rolling dust clouds falling down */}
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  top: `${-20 + i * 6}%`,
                  height: 120,
                  filter: `blur(${16 + i * 6}px)`,
                  background: `radial-gradient(ellipse 55% 80% at ${15 + i * 20}% 50%, rgba(224,196,140,${0.75 - i * 0.08}), transparent 72%)`,
                }}
                initial={{ y: "-140%" }}
                animate={{ y: "600%" }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===========================================================================
// SCENE 2, Desert: the stakes, presented by Sandyx
// ===========================================================================
const DESERT_LINES = [
  "The World Meteorological Association and the WHO state that 3.8 billion people, nearly half the world's population, are exposed to dust levels that vastly exceed safe thresholds.",
  "In the Middle East alone, particulate pollution is responsible for nearly 118,000 premature deaths. The World Bank estimates the MENA region loses around $13 billion each year to sand and dust storms affecting health, infrastructure, and agriculture.",
  "This loss of life is the cost of severe sand and dust storms. Our project hopes to make the sky clearer for all those that see a future as bright.",
  "A project designed for where the wind meets the soil.",
];

function DesertScene({ onFinish }: { onFinish: () => void }) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(false);

  const advance = useCallback(() => {
    setTyped(false);
    if (i < DESERT_LINES.length - 1) setI((v) => v + 1);
    else onFinish();
  }, [i, onFinish]);

  // Auto-advance a beat after each line finishes typing (longer for the dense stats).
  useEffect(() => {
    if (!typed) return;
    const id = setTimeout(advance, 5200);
    return () => clearTimeout(id);
  }, [typed, advance]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #ffdca0 0%, #ffb469 42%, #f0a24e 62%, #e7c98a 62.1%)",
        }}
      />
      {/* Sun */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 150,
          height: 150,
          top: "10%",
          left: "12%",
          background:
            "radial-gradient(circle, #fff6d0 0%, #ffd24d 55%, transparent 74%)",
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Dunes */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1000 300"
        preserveAspectRatio="none"
        style={{ height: "55%" }}
      >
        <path d="M0 120 Q250 40 500 110 T1000 90 V300 H0 Z" fill="#e7c98a" />
        <path d="M0 180 Q300 110 600 175 T1000 160 V300 H0 Z" fill="#d8b56f" />
        <path d="M0 240 Q250 200 550 235 T1000 220 V300 H0 Z" fill="#c79b52" />
      </svg>
      {/* Cacti */}
      {[
        { l: "72%", s: 1 },
        { l: "86%", s: 0.7 },
        { l: "20%", s: 0.55 },
      ].map((c, k) => (
        <div
          key={k}
          className="absolute"
          style={{
            left: c.l,
            bottom: "16%",
            transform: `scale(${c.s})`,
            transformOrigin: "bottom",
          }}
        >
          <div
            style={{
              width: 18,
              height: 90,
              background: "#4f7a3a",
              borderRadius: 8,
            }}
          />
          <div
            className="absolute"
            style={{
              left: -14,
              top: 24,
              width: 14,
              height: 34,
              background: "#4f7a3a",
              borderRadius: 8,
            }}
          />
          <div
            className="absolute"
            style={{
              left: -14,
              top: 24,
              width: 14,
              height: 14,
              background: "#4f7a3a",
              borderRadius: 8,
              transform: "translateY(-14px)",
            }}
          />
          <div
            className="absolute"
            style={{
              right: -14,
              top: 12,
              width: 14,
              height: 40,
              background: "#4f7a3a",
              borderRadius: 8,
            }}
          />
          <div
            className="absolute"
            style={{
              right: -14,
              top: 12,
              width: 14,
              height: 14,
              background: "#4f7a3a",
              borderRadius: 8,
              transform: "translateY(-14px)",
            }}
          />
        </div>
      ))}
      {/* Drifting dust */}
      {[0, 1, 2].map((k) => (
        <motion.div
          key={k}
          className="absolute"
          style={{
            top: `${30 + k * 10}%`,
            width: "50%",
            height: 60,
            filter: "blur(24px)",
            background:
              "radial-gradient(ellipse, rgba(231,201,138,0.5), transparent 70%)",
          }}
          animate={{ x: ["-30%", "130%"] }}
          transition={{
            duration: 10 + k * 4,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Sandyx presenting: the speech bubble with Sandyx directly beneath it
          (the bubble's tail points down onto her). The column hugs the bottom and
          grows upward as the dense stat lines make the bubble taller. */}
      <div className="absolute z-20 inset-x-[4%] sm:inset-x-[10%] top-[12%] bottom-[7%] flex flex-col justify-end items-center sm:items-start gap-2">
        <AnimatePresence mode="wait">
          <SpeechBubble
            key={i}
            text={DESERT_LINES[i]}
            accent={i === DESERT_LINES.length - 1 ? C.teal : C.amber}
            onDone={() => setTyped(true)}
          />
        </AnimatePresence>
        <motion.img
          src="/sandyx.png"
          alt="Sandyx"
          draggable={false}
          className="w-24 sm:w-36 object-contain sm:ml-8 shrink-0"
          style={{ filter: "drop-shadow(0 14px 20px rgba(0,0,0,0.4))" }}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Click-to-continue */}
      <button
        onClick={advance}
        className="btn-colored absolute bottom-6 right-6 z-30 font-retro text-[11px] px-4 py-3 border-[3px]"
        style={{
          borderColor: "#ffffff",
          color: "#ffffff",
          background: "rgba(0,0,0,0.4)",
        }}
      >
        NEXT ▶
      </button>
      <div className="absolute bottom-7 left-6 z-30 flex gap-2.5">
        {DESERT_LINES.map((_, k) => (
          <span
            key={k}
            className="w-4 h-4 border"
            style={{
              background: k <= i ? C.amber : "rgba(255,255,255,0.15)",
              borderColor: "rgba(0,0,0,0.4)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// SCENE 3, Lab: top-down 80s arcade (WASD/arrows), 5 Prong-1 & 2 experiments
// ===========================================================================
const WORLD = { w: 640, h: 400 };

type LabIcon = "incubator" | "tube" | "flask" | "cylinder" | "droplet";
// --- Pac-Man-style maze -----------------------------------------------------
const MAZE = [
  "###############",
  "#......#......#",
  "#.###.#.#.###.#",
  "#...#.....#...#",
  "#.#.#.###.#.#.#",
  "#.............#",
  "#.#.#.###.#.#.#",
  "#...#.....#...#",
  "#.###.#.#.###.#",
  "#.....#.#.....#",
  "###############",
];
const MCOLS = 15;
const MROWS = 11;
const CW = WORLD.w / MCOLS;
const CH = WORLD.h / MROWS;
const isWallCell = (c: number, r: number) =>
  c < 0 || r < 0 || c >= MCOLS || r >= MROWS || MAZE[r][c] === "#";
const cellCenter = (c: number, r: number): [number, number] => [
  (c + 0.5) * CW,
  (r + 0.5) * CH,
];

interface MazeStation {
  col: number;
  row: number;
  color: string;
  icon: LabIcon;
  label: string;
}
// Ordered to match the objectives below; spread across the maze.
const STATIONS: MazeStation[] = [
  { col: 1, row: 1, color: C.teal, icon: "incubator", label: "INCUBATOR" },
  { col: 13, row: 1, color: C.green, icon: "tube", label: "GLUTAMATE" },
  { col: 7, row: 3, color: C.amber, icon: "flask", label: "FERMENTER" },
  { col: 1, row: 9, color: C.purple, icon: "cylinder", label: "CO₂/CA" },
  { col: 13, row: 9, color: C.magenta, icon: "droplet", label: "Ca²⁺" },
];
const PLAYER_START: [number, number] = [6, 5];
const GHOST_START: [number, number] = [7, 7];

// Every corridor cell except the player start and the station cells gets a pellet.
function seedPellets(): Set<number> {
  const occupied = new Set<number>([
    PLAYER_START[1] * MCOLS + PLAYER_START[0],
  ]);
  STATIONS.forEach((s) => occupied.add(s.row * MCOLS + s.col));
  const set = new Set<number>();
  for (let r = 0; r < MROWS; r++) {
    for (let c = 0; c < MCOLS; c++) {
      if (MAZE[r][c] === "." && !occupied.has(r * MCOLS + c))
        set.add(r * MCOLS + c);
    }
  }
  return set;
}

// BFS one step from (sc,sr) toward (gc,gr) through the maze, powers the sand chaser.
function bfsNextStep(
  sc: number,
  sr: number,
  gc: number,
  gr: number,
): [number, number] | null {
  if (sc === gc && sr === gr) return null;
  const prev = new Map<number, number>();
  prev.set(sr * MCOLS + sc, -1);
  const q: [number, number][] = [[sc, sr]];
  let found = false;
  while (q.length) {
    const [c, r] = q.shift()!;
    if (c === gc && r === gr) {
      found = true;
      break;
    }
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nc = c + dc,
        nr = r + dr;
      if (isWallCell(nc, nr)) continue;
      const key = nr * MCOLS + nc;
      if (prev.has(key)) continue;
      prev.set(key, r * MCOLS + c);
      q.push([nc, nr]);
    }
  }
  if (!found) return null;
  let key = gr * MCOLS + gc;
  const path: number[] = [];
  while (key !== -1) {
    path.push(key);
    key = prev.get(key)!;
  }
  path.reverse();
  if (path.length < 2) return null;
  const next = path[1];
  return [next % MCOLS, Math.floor(next / MCOLS)];
}

// --- Canvas icon painters (no emoji) --------------------------------------
function drawLabIcon(
  ctx: CanvasRenderingContext2D,
  icon: LabIcon,
  cx: number,
  cy: number,
) {
  ctx.save();
  ctx.strokeStyle = "#0a0d1c";
  ctx.fillStyle = "#0a0d1c";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (icon === "incubator") {
    ctx.strokeRect(cx - 14, cy - 14, 28, 26);
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 14);
    ctx.lineTo(cx - 2, cy + 12);
    ctx.stroke(); // door split
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 8, 2, 0, Math.PI * 2);
    ctx.fill(); // indicator
    ctx.strokeRect(cx - 11, cy - 10, 6, 6); // window
  } else if (icon === "tube") {
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 15);
    ctx.lineTo(cx - 6, cy + 8);
    ctx.arc(cx, cy + 8, 6, Math.PI, 0, true);
    ctx.lineTo(cx + 6, cy - 15);
    ctx.stroke();
    ctx.fillRect(cx - 5, cy + 2, 10, 8); // liquid
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 15);
    ctx.lineTo(cx + 8, cy - 15);
    ctx.stroke();
  } else if (icon === "flask") {
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 15);
    ctx.lineTo(cx - 4, cy - 4);
    ctx.lineTo(cx - 14, cy + 12);
    ctx.lineTo(cx + 14, cy + 12);
    ctx.lineTo(cx + 4, cy - 4);
    ctx.lineTo(cx + 4, cy - 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 15);
    ctx.lineTo(cx + 7, cy - 15);
    ctx.stroke();
    ctx.fillRect(cx - 10, cy + 4, 20, 8); // liquid
  } else if (icon === "cylinder") {
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy + 14);
    ctx.lineTo(cx - 9, cy - 8);
    ctx.arc(cx, cy - 8, 9, Math.PI, 0);
    ctx.lineTo(cx + 9, cy + 14);
    ctx.closePath();
    ctx.stroke();
    ctx.fillRect(cx - 3, cy - 17, 6, 5); // valve
  } else if (icon === "droplet") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 16);
    ctx.bezierCurveTo(cx + 13, cy - 2, cx + 9, cy + 14, cx, cy + 14);
    ctx.bezierCurveTo(cx - 9, cy + 14, cx - 13, cy - 2, cx, cy - 16);
    ctx.stroke();
  }
  ctx.restore();
}

// The "sand particle" chaser, a Pac-Man-style ghost made of drifting sand.
function drawSand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  t: number,
  lookX: number,
  lookY: number,
) {
  ctx.save();
  // trailing sand sparkle
  for (let i = 0; i < 4; i++) {
    const a = t / 300 + i;
    ctx.fillStyle = `rgba(199,155,82,${0.25 - i * 0.05})`;
    ctx.beginPath();
    ctx.arc(
      x - Math.cos(a) * (r + 4 + i * 3),
      y - Math.sin(a) * (r + 4 + i * 3),
      2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // body (dome + wavy skirt)
  ctx.beginPath();
  ctx.arc(x, y - 2, r, Math.PI, 0);
  ctx.lineTo(x + r, y + r - 2);
  const humps = 3;
  for (let i = 0; i < humps; i++) {
    const seg = (r * 2) / humps;
    const bx = x + r - seg * (i + 0.5);
    const dir = i % 2 === 0 ? 1 : -1;
    ctx.quadraticCurveTo(
      bx,
      y + r - 2 + 5 * dir,
      x + r - seg * (i + 1),
      y + r - 2,
    );
  }
  ctx.closePath();
  const grad = ctx.createLinearGradient(x, y - r, x, y + r);
  grad.addColorStop(0, "#efd9a6");
  grad.addColorStop(1, "#c79b52");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(122,84,30,0.6)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // eyes looking toward the player
  const dx = lookX - x,
    dy = lookY - y;
  const m = Math.hypot(dx, dy) || 1;
  const ex = (dx / m) * 1.6,
    ey = (dy / m) * 1.6;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + sx * r * 0.4, y - 2, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1e00";
    ctx.beginPath();
    ctx.arc(x + sx * r * 0.4 + ex, y - 2 + ey, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

interface Objective {
  title: string;
  hint: string;
}
const OBJECTIVES: Objective[] = [
  {
    title: "INOCULATE B. SUBTILIS",
    hint: "Drive Sandyx to the INCUBATOR and grab the starter culture (OD600).",
  },
  {
    title: "FEED GLUTAMATE PRECURSOR",
    hint: "Take the culture to the GLUTAMATE bench, the substrate for γ-PGA.",
  },
  {
    title: "EXPRESS γ-PGA (pgsBCA)",
    hint: "Run the FERMENTER to over-express the poly-γ-glutamic-acid operon.",
  },
  {
    title: "SECRETE CARBONIC ANHYDRASE",
    hint: "At CO₂/CA, anchor CA via Sortase to turn CO₂ into CaCO₃ biocement.",
  },
  {
    title: "CROSS-LINK WITH Ca²⁺",
    hint: "Finish at the Ca²⁺ BATH to lock the crust into a tough gel.",
  },
];

function LabGame({
  onSolved,
  isTouch,
}: {
  onSolved: () => void;
  isTouch: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const pos = useRef({
    x: cellCenter(...PLAYER_START)[0],
    y: cellCenter(...PLAYER_START)[1],
    bob: 0,
    face: 1,
  });
  const ghost = useRef({
    x: cellCenter(...GHOST_START)[0],
    y: cellCenter(...GHOST_START)[1],
    tc: -1,
    tr: -1,
    retime: 0,
  });
  const objRef = useRef(0);
  const progRef = useRef(0);
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const flashRef = useRef(0);
  const hurtRef = useRef(0);
  const pellets = useRef<Set<number>>(new Set());
  const scoreRef = useRef(0);

  const [objIndex, setObjIndex] = useState(0);
  const [moved, setMoved] = useState(false);
  const [solved, setSolved] = useState(false);
  const [pelletsLeft, setPelletsLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [objPopup, setObjPopup] = useState(true);
  const movedRef = useRef(false);
  // The sim freezes while an objective pop-up is up. Starts paused so the very first
  // objective is read before play begins.
  const pausedRef = useRef(true);

  // Show the current objective as a timed pop-up (auto-dismisses after 7s) whenever
  // the active objective changes. The game pauses in the background for those 7s.
  useEffect(() => {
    if (solved) return;
    setObjPopup(true);
    const id = setTimeout(() => setObjPopup(false), 7000);
    return () => clearTimeout(id);
  }, [objIndex, solved]);

  // Keep the pause flag in lockstep with the pop-up (read inside the RAF loop).
  useEffect(() => {
    pausedRef.current = objPopup && !solved;
  }, [objPopup, solved]);

  // Award points (no persistence, no high-score).
  const bumpScore = useCallback((delta: number) => {
    scoreRef.current = Math.max(0, scoreRef.current + delta);
    setScore(scoreRef.current);
  }, []);

  // Load Sandyx sprite + seed the pellets.
  useEffect(() => {
    const img = new Image();
    img.src = "/sandyx.png";
    img.onload = () => (spriteRef.current = img);

    const set = seedPellets();
    pellets.current = set;
    setPelletsLeft(set.size);
  }, []);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.includes(k)) {
        e.preventDefault();
        keys.current[k] = true;
        if (!movedRef.current) {
          movedRef.current = true;
          setMoved(true);
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Main loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const wrap = wrapRef.current!;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    };
    resize();
    window.addEventListener("resize", resize);

    const R = Math.min(CW, CH) * 0.3;
    const blocked = (cx: number, cy: number) =>
      isWallCell(Math.floor((cx - R) / CW), Math.floor(cy / CH)) ||
      isWallCell(Math.floor((cx + R) / CW), Math.floor(cy / CH)) ||
      isWallCell(Math.floor(cx / CW), Math.floor((cy - R) / CH)) ||
      isWallCell(Math.floor(cx / CW), Math.floor((cy + R) / CH));

    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      const p = pos.current;
      const g = ghost.current;

      // While an objective pop-up is up the world is frozen: still render it (so the game
      // sits "in the background" behind the pop-up) but run no movement, interaction, or chaser.
      if (pausedRef.current) {
        draw(ctx, canvas, p, g, t);
        raf = requestAnimationFrame(step);
        return;
      }

      // --- player movement (maze collision, axis-separated) ---
      let vx = 0,
        vy = 0;
      if (keys.current["a"] || keys.current["arrowleft"]) vx -= 1;
      if (keys.current["d"] || keys.current["arrowright"]) vx += 1;
      if (keys.current["w"] || keys.current["arrowup"]) vy -= 1;
      if (keys.current["s"] || keys.current["arrowdown"]) vy += 1;
      const spd = 128;
      if (vx || vy) {
        const m = Math.hypot(vx, vy) || 1;
        const nx = p.x + (vx / m) * spd * dt;
        if (!blocked(nx, p.y)) p.x = nx;
        const ny = p.y + (vy / m) * spd * dt;
        if (!blocked(p.x, ny)) p.y = ny;
        p.bob += dt * 10;
        if (vx !== 0) p.face = vx > 0 ? 1 : -1;
      }

      // --- eat pellets ---
      const pc = Math.floor(p.x / CW),
        pr = Math.floor(p.y / CH);
      const pkey = pr * MCOLS + pc;
      if (pellets.current.has(pkey)) {
        pellets.current.delete(pkey);
        setPelletsLeft(pellets.current.size);
        bumpScore(10);
      }

      // --- interaction with the active station ---
      if (!solved && objRef.current < STATIONS.length) {
        const s = STATIONS[objRef.current];
        const [scx, scy] = cellCenter(s.col, s.row);
        const near = Math.hypot(p.x - scx, p.y - scy) < CW * 0.6;
        if (near) {
          progRef.current = Math.min(1, progRef.current + dt / 0.7);
          if (progRef.current >= 1) {
            progRef.current = 0;
            flashRef.current = 1;
            const next = objRef.current + 1;
            objRef.current = next;
            setObjIndex(next);
            bumpScore(500);
            if (next >= STATIONS.length) {
              bumpScore(1000);
              setSolved(true);
            }
          }
        } else {
          progRef.current = Math.max(0, progRef.current - dt / 0.5);
        }
      }
      if (flashRef.current > 0)
        flashRef.current = Math.max(0, flashRef.current - dt / 0.6);
      if (hurtRef.current > 0)
        hurtRef.current = Math.max(0, hurtRef.current - dt / 0.8);

      // --- sand chaser: BFS toward the player, step cell-by-cell ---
      if (!solved) {
        const gc = Math.floor(g.x / CW),
          gr = Math.floor(g.y / CH);
        if (
          g.tc < 0 ||
          (Math.abs(g.x - (g.tc + 0.5) * CW) < 2 &&
            Math.abs(g.y - (g.tr + 0.5) * CH) < 2) ||
          t - g.retime > 500
        ) {
          const nextStep = bfsNextStep(
            gc,
            gr,
            Math.floor(p.x / CW),
            Math.floor(p.y / CH),
          );
          if (nextStep) {
            g.tc = nextStep[0];
            g.tr = nextStep[1];
          }
          g.retime = t;
        }
        if (g.tc >= 0) {
          const [tx, ty] = cellCenter(g.tc, g.tr);
          const gd = Math.hypot(tx - g.x, ty - g.y) || 1;
          const gspd = 82;
          g.x += ((tx - g.x) / gd) * Math.min(gspd * dt, gd);
          g.y += ((ty - g.y) / gd) * Math.min(gspd * dt, gd);
        }
        // caught → restart from scratch: reset position, objectives, pellets, score
        if (Math.hypot(p.x - g.x, p.y - g.y) < R * 1.5) {
          const [px, py] = cellCenter(...PLAYER_START);
          p.x = px;
          p.y = py;
          const [ggx, ggy] = cellCenter(...GHOST_START);
          g.x = ggx;
          g.y = ggy;
          g.tc = -1;
          hurtRef.current = 1;
          objRef.current = 0;
          progRef.current = 0;
          setObjIndex(0);
          scoreRef.current = 0;
          setScore(0);
          const fresh = seedPellets();
          pellets.current = fresh;
          setPelletsLeft(fresh.size);
        }
      }

      draw(ctx, canvas, p, g, t);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  const draw = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    p: { x: number; y: number; bob: number; face: number },
    g: { x: number; y: number },
    t: number,
  ) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const scale = Math.min(cw / WORLD.w, ch / WORLD.h);
    const ox = (cw - WORLD.w * scale) / 2;
    const oy = (ch - WORLD.h * scale) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#05060f";
    ctx.fillRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    // maze floor
    ctx.fillStyle = "#0a0e24";
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);

    // walls (Pac-Man neon blue)
    for (let r = 0; r < MROWS; r++) {
      for (let c = 0; c < MCOLS; c++) {
        if (MAZE[r][c] !== "#") continue;
        const x = c * CW,
          y = r * CH;
        ctx.fillStyle = "#141a52";
        ctx.fillRect(x, y, CW + 0.6, CH + 0.6);
        ctx.fillStyle = "#26319e";
        ctx.fillRect(x + 4, y + 4, CW - 8, CH - 8);
        ctx.strokeStyle = "#5a6be0";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, CW - 8, CH - 8);
      }
    }

    // pellets
    ctx.fillStyle = "#ffe08a";
    pellets.current.forEach((key) => {
      const c = key % MCOLS,
        r = Math.floor(key / MCOLS);
      ctx.beginPath();
      ctx.arc((c + 0.5) * CW, (r + 0.5) * CH, 2.6, 0, Math.PI * 2);
      ctx.fill();
    });

    // stations
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    STATIONS.forEach((s, i) => {
      const active = i === objRef.current;
      const done = i < objRef.current;
      const [cx, cy] = cellCenter(s.col, s.row);
      const rad = Math.min(CW, CH) * 0.46;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = done ? "rgba(44,125,90,0.55)" : s.color;
      ctx.fill();
      if (active && !solved) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx, cy, rad + 3 + Math.sin(t / 200) * 1.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawLabIcon(ctx, s.icon, cx, cy - 1);
      if (done) {
        ctx.strokeStyle = "#eafff0";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy);
        ctx.lineTo(cx - 1, cy + 5);
        ctx.lineTo(cx + 7, cy - 5);
        ctx.stroke();
      }
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillStyle = active ? "#ffffff" : "rgba(255,255,255,0.7)";
      ctx.fillText(s.label, cx, cy + rad + 6);
    });

    // interaction progress ring
    if (progRef.current > 0) {
      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y - CH * 0.55,
        10,
        -Math.PI / 2,
        -Math.PI / 2 + progRef.current * Math.PI * 2,
      );
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#7cff6b";
      ctx.stroke();
    }

    // player sprite
    const bob = Math.sin(p.bob) * 2.5;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 12, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const img = spriteRef.current;
    if (img) {
      const w = 30;
      const h = (img.height / img.width) * w;
      ctx.save();
      if (hurtRef.current > 0)
        ctx.globalAlpha = 0.35 + Math.abs(Math.sin(t / 40)) * 0.5;
      ctx.translate(p.x, p.y + bob);
      ctx.scale(p.face, 1);
      ctx.drawImage(img, -w / 2, -h + 12, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = C.amber;
      ctx.fillRect(p.x - 8, p.y - 14, 16, 22);
    }

    // the sand chaser
    drawSand(ctx, g.x, g.y, Math.min(CW, CH) * 0.34, t, p.x, p.y);

    // completion flash
    if (flashRef.current > 0) {
      ctx.fillStyle = `rgba(124,255,107,${flashRef.current * 0.22})`;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    }
    ctx.restore();
  };

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 crt-scanlines"
      style={{ background: C.bg0 }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Objective tracker: compact chips across the top */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex gap-1.5 sm:gap-2 px-2 max-w-[96%] pointer-events-none">
        {OBJECTIVES.map((o, k) => {
          const done = k < objIndex;
          const active = k === objIndex && !solved;
          const col = done
            ? C.green
            : active
              ? C.amber
              : "rgba(232,236,255,0.5)";
          return (
            <div
              key={k}
              className="font-retro text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-1.5 border flex items-center gap-1 whitespace-nowrap"
              style={{
                borderColor: col,
                color: col,
                background: "rgba(9,13,32,0.8)",
              }}
            >
              <span>{done ? "✔" : active ? "▶" : k + 1}</span>
              <span className="hidden sm:inline">{STATIONS[k].label}</span>
            </div>
          );
        })}
      </div>

      {/* Objective modal: a window shown ON TOP of the game. The world is paused
          (pausedRef) and dimmed behind this scrim for the 7s, so the game reads as an
          unplayable background. A new modal appears each time an objective is completed. */}
      <AnimatePresence>
        {objPopup && !solved && (
          <motion.div
            key={`scrim-${objIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-50 flex items-center justify-center px-4"
            style={{
              background: "rgba(4,6,16,0.74)",
              backdropFilter: "blur(2px)",
            }}
          >
            <motion.div
              key={`win-${objIndex}`}
              initial={{ y: -18, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -18, opacity: 0, scale: 0.96 }}
              className="w-[92%] max-w-md"
            >
              <div
                className="h-2 w-full"
                style={{ background: "rgba(0,0,0,0.45)" }}
              >
                <motion.div
                  key={`bar-${objIndex}`}
                  className="h-full"
                  style={{ background: C.amber }}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 7, ease: "linear" }}
                />
              </div>
              <div
                className="border-[3px] border-t-0 px-4 py-4 text-center"
                style={{
                  borderColor: C.amber,
                  background: "rgba(9,13,32,0.98)",
                  boxShadow: "6px 6px 0 rgba(0,0,0,0.6)",
                }}
              >
                <div
                  className="font-retro text-[9px] mb-2"
                  style={{ color: C.amber }}
                >
                  OBJECTIVE {objIndex + 1}/{OBJECTIVES.length}
                </div>
                <div
                  className="font-retro text-[11px] sm:text-[13px]"
                  style={{ color: C.speech }}
                >
                  {OBJECTIVES[objIndex]?.title}
                </div>
                <div
                  className="font-retro text-[9px] sm:text-[10px] mt-2 leading-[1.9]"
                  style={{ color: "#c7d0ff" }}
                >
                  {OBJECTIVES[objIndex]?.hint}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls hint (top-right), disappears after first move */}
      <AnimatePresence>
        {!moved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-16 right-4 border-[3px] px-4 py-4"
            style={{
              borderColor: C.teal,
              background: "rgba(9,13,32,0.94)",
              boxShadow:
                "0 0 16px rgba(91,224,200,0.4), 5px 5px 0 rgba(0,0,0,0.55)",
            }}
          >
            <div
              className="font-retro text-[10px] leading-[2.1]"
              style={{ color: C.teal }}
            >
              {isTouch ? "USE THE PAD TO MOVE" : "ARROW KEYS / WASD TO MOVE"}
              <br />
              <span style={{ color: C.sand }}>DODGE THE SAND!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pellet counter (bottom-left on desktop; top-left on touch so the D-pad is clear) */}
      <div
        className={`absolute border-2 px-3 py-2 flex items-center gap-2 ${
          isTouch ? "top-12 left-3" : "bottom-4 left-4"
        }`}
        style={{ borderColor: C.amber, background: "rgba(9,13,32,0.85)" }}
      >
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ background: "#ffe08a" }}
        />
        <span className="font-retro text-[9px]" style={{ color: C.speech }}>
          {pelletsLeft} LEFT
        </span>
      </div>

      {/* Warning: getting caught restarts the run from scratch (bottom-right) */}
      <div
        className="absolute bottom-4 right-4 border-2 px-3 py-2 max-w-[46%] sm:max-w-[220px]"
        style={{ borderColor: C.red, background: "rgba(9,13,32,0.85)" }}
      >
        <div className="font-retro text-[8px] leading-[1.8]" style={{ color: C.red }}>
          CAUGHT BY THE SAND ={" "}
          <span style={{ color: C.sand }}>RESTART FROM SCRATCH</span>
        </div>
      </div>

      {/* Touch D-pad */}
      {isTouch && !solved && (
        <TouchDpad
          keysRef={keys}
          onFirstMove={() => {
            if (!movedRef.current) {
              movedRef.current = true;
              setMoved(true);
            }
          }}
        />
      )}

      {/* Solution splash */}
      <AnimatePresence>
        {solved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex items-center justify-center p-4"
            style={{ background: "rgba(5,6,15,0.86)" }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="text-center max-w-2xl border-4 p-10"
              style={{
                borderColor: C.green,
                background: C.bg1,
                boxShadow:
                  "0 0 30px rgba(124,255,107,0.4), 12px 12px 0 rgba(0,0,0,0.55)",
              }}
            >
              <div
                className="font-retro-glow text-[16px] mb-6 retro-blink"
                style={{ color: C.green }}
              >
                ★ SOLUTION READY ★
              </div>
              <div
                className="font-retro text-[12px] leading-[2.1]"
                style={{ color: C.speech }}
              >
                BioCrust: engineered{" "}
                <span style={{ color: C.amber }}>B. subtilis</span> secreting
                <span style={{ color: C.amber }}> γ-PGA</span> +
                <span style={{ color: C.teal }}> CaCO₃ biocement</span>, Ca²⁺
                cross-linked into a wind-proof living crust that locks the sand
                down.
              </div>
              <div
                className="mt-6 font-retro text-[10px] flex items-center justify-center"
                style={{ color: C.speech }}
              >
                <span>
                  SCORE{" "}
                  <span style={{ color: C.amber }}>
                    {score.toString().padStart(6, "0")}
                  </span>
                </span>
              </div>
              <div className="mt-6 flex justify-center">
                <RetroButton tone="teal" onClick={onSolved}>
                  PROCEED ▶
                </RetroButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// module-scope constant referenced inside the keyboard handler
const MOVE_KEYS = [
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
];

// ===========================================================================
// SCENE 4, Drone deployment: fly a drone, spray the crust, watch it hold
// ===========================================================================
const GRID_COLS = 40;
const GRID_ROWS = 26;
// A crust cell at/above this coverage is "locked", fully cured and immune to the sand ghost.
const LOCK = 0.9;

function DroneGame({
  binder,
  onFifteen,
  isTouch,
}: {
  binder: number; // 0.4..1.6 strength multiplier from tuning
  onFifteen: () => void;
  isTouch: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keys = useRef<Record<string, boolean>>({});
  const drone = useRef({ x: WORLD.w / 2, y: WORLD.h / 2 });
  const grid = useRef<number[]>(new Array(GRID_COLS * GRID_ROWS).fill(0));
  const firedRef = useRef(false);
  const startRef = useRef(0);
  // The sand-particle ghost: roams the field and eats un-locked crust; the drone must
  // fully lock cells before it arrives. Steered with velocity smoothing (no snapping).
  const ghost = useRef({
    x: WORLD.w * 0.14,
    y: WORLD.h * 0.2,
    vx: 0,
    vy: 0,
    tx: WORLD.w * 0.5,
    ty: WORLD.h * 0.5,
    retime: 0,
  });
  const securedRef = useRef(0);
  const eatenRef = useRef(0);

  const [hud, setHud] = useState({
    coverage: 0,
    cohesion: 0,
    secured: 0,
    eaten: 0,
  });

  useEffect(() => {
    const MOVE = [...MOVE_KEYS, " "];
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (MOVE.includes(k)) {
        e.preventDefault();
        keys.current[k === " " ? "space" : k] = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k === " " ? "space" : k] = false;
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    startRef.current = last;
    let hudTick = 0;

    const resize = () => {
      const rect = wrapRef.current!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    };
    resize();
    window.addEventListener("resize", resize);

    const cellW = WORLD.w / GRID_COLS;
    const cellH = WORLD.h / GRID_ROWS;

    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      const d = drone.current;
      const spd = 190;
      let vx = 0;
      let vy = 0;
      if (keys.current["a"] || keys.current["arrowleft"]) vx -= 1;
      if (keys.current["d"] || keys.current["arrowright"]) vx += 1;
      if (keys.current["w"] || keys.current["arrowup"]) vy -= 1;
      if (keys.current["s"] || keys.current["arrowdown"]) vy += 1;
      if (vx || vy) {
        const m = Math.hypot(vx, vy) || 1;
        d.x += (vx / m) * spd * dt;
        d.y += (vy / m) * spd * dt;
      }
      d.x = Math.max(16, Math.min(WORLD.w - 16, d.x));
      d.y = Math.max(16, Math.min(WORLD.h - 16, d.y));

      // spraying (space held, or always-on gentle mist to keep it moving)
      const spraying = keys.current["space"];
      if (spraying) {
        firedRef.current = true;
        const cc = Math.floor(d.x / cellW);
        const cr = Math.floor(d.y / cellH);
        const R = 2;
        for (let r = -R; r <= R; r++) {
          for (let c = -R; c <= R; c++) {
            const gx = cc + c;
            const gy = cr + r;
            if (gx < 0 || gy < 0 || gx >= GRID_COLS || gy >= GRID_ROWS)
              continue;
            if (Math.hypot(c, r) > R) continue;
            const idx = gy * GRID_COLS + gx;
            const before = grid.current[idx];
            grid.current[idx] = Math.min(1, before + binder * dt * 1.6);
          }
        }
      }

      // --- sand ghost: race the drone, eating un-locked crust ---
      const gh = ghost.current;
      // Re-target a few times a second: chase the nearest crust that is covered but not yet locked.
      if (t - gh.retime > 340) {
        gh.retime = t;
        let bestD = Infinity,
          btx = -1,
          bty = -1;
        for (let i = 0; i < grid.current.length; i++) {
          const v = grid.current[i];
          if (v <= 0.12 || v >= LOCK) continue; // ignore bare sand and locked crust
          const gx = ((i % GRID_COLS) + 0.5) * cellW;
          const gy = (Math.floor(i / GRID_COLS) + 0.5) * cellH;
          const dd = (gx - gh.x) ** 2 + (gy - gh.y) ** 2;
          if (dd < bestD) {
            bestD = dd;
            btx = gx;
            bty = gy;
          }
        }
        if (btx >= 0) {
          gh.tx = btx;
          gh.ty = bty;
        } else {
          gh.tx = d.x;
          gh.ty = d.y;
        } // nothing soft to eat → hover near the drone
      }
      // Smoothly steer velocity toward the target (framerate-independent lerp).
      {
        const gdx = gh.tx - gh.x,
          gdy = gh.ty - gh.y;
        const gm = Math.hypot(gdx, gdy) || 1;
        const gspd = 78;
        const steer = 1 - Math.pow(0.0015, dt);
        gh.vx += ((gdx / gm) * gspd - gh.vx) * steer;
        gh.vy += ((gdy / gm) * gspd - gh.vy) * steer;
        gh.x = Math.max(10, Math.min(WORLD.w - 10, gh.x + gh.vx * dt));
        gh.y = Math.max(10, Math.min(WORLD.h - 10, gh.y + gh.vy * dt));
      }
      // Erode un-locked crust in the ghost's footprint; locked crust resists it.
      {
        const cc = Math.floor(gh.x / cellW),
          cr = Math.floor(gh.y / cellH);
        const ER = 2;
        for (let r = -ER; r <= ER; r++) {
          for (let c = -ER; c <= ER; c++) {
            const gx = cc + c,
              gy = cr + r;
            if (gx < 0 || gy < 0 || gx >= GRID_COLS || gy >= GRID_ROWS)
              continue;
            if (Math.hypot(c, r) > ER) continue;
            const idx = gy * GRID_COLS + gx;
            const before = grid.current[idx];
            if (before <= 0 || before >= LOCK) continue;
            const after = Math.max(0, before - 0.7 * dt);
            grid.current[idx] = after;
            eatenRef.current += before - after;
          }
        }
      }

      // draw
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      const scale = Math.min(cw / WORLD.w, ch / WORLD.h);
      const oxx = (cw - WORLD.w * scale) / 2;
      const oyy = (ch - WORLD.h * scale) / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#05060f";
      ctx.fillRect(0, 0, cw, ch);
      ctx.save();
      ctx.translate(oxx, oyy);
      ctx.scale(scale, scale);

      // sand base
      ctx.fillStyle = C.sand;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
      // dune shading bands
      for (let y = 0; y < WORLD.h; y += 40) {
        ctx.fillStyle =
          (y / 40) % 2 === 0
            ? "rgba(199,155,82,0.25)"
            : "rgba(231,201,138,0.15)";
        ctx.fillRect(0, y, WORLD.w, 20);
      }

      // stabilized crust cells
      let covered = 0;
      let secured = 0;
      for (let i = 0; i < grid.current.length; i++) {
        const v = grid.current[i];
        if (v <= 0) continue;
        covered += v;
        const gx = (i % GRID_COLS) * cellW;
        const gy = Math.floor(i / GRID_COLS) * cellH;
        if (v >= LOCK) {
          // locked crust, bright, glowing, ghost-proof
          secured++;
          ctx.fillStyle = "rgba(124,255,107,0.85)";
          ctx.fillRect(gx, gy, cellW + 0.5, cellH + 0.5);
          ctx.fillStyle = "rgba(200,255,190,0.5)";
          ctx.fillRect(gx + 2, gy + 2, cellW - 4, cellH - 4);
        } else {
          // curing crust: darker/greener as it hardens
          const g = Math.floor(120 + v * 80);
          ctx.fillStyle = `rgba(${90 - v * 30},${g},${110 + v * 40},${0.35 + v * 0.5})`;
          ctx.fillRect(gx, gy, cellW + 0.5, cellH + 0.5);
        }
      }
      securedRef.current = secured;
      const coverage = covered / grid.current.length;

      // spray cone
      if (spraying) {
        ctx.fillStyle = "rgba(124,255,107,0.18)";
        ctx.beginPath();
        ctx.arc(drone.current.x, drone.current.y, 42, 0, Math.PI * 2);
        ctx.fill();
      }

      // the sand ghost (same drifting-sand sprite as the maze chaser)
      drawSand(ctx, gh.x, gh.y, 15, t, drone.current.x, drone.current.y);

      // drone (pixel quadcopter)
      const dx = drone.current.x;
      const dy = drone.current.y;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(dx, dy + 22, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b3350";
      ctx.fillRect(dx - 4, dy - 22, 8, 44);
      ctx.fillRect(dx - 22, dy - 4, 44, 8);
      const rotor = (t / 40) % 2 < 1 ? "#9fb3ff" : "#6b7fd8";
      [
        [-22, -22],
        [22, -22],
        [-22, 22],
        [22, 22],
      ].forEach(([ex, ey]) => {
        ctx.fillStyle = rotor;
        ctx.beginPath();
        ctx.arc(
          dx + (ex / 1.0) * 0 + (ex < 0 ? -18 : 18),
          dy + (ey < 0 ? -18 : 18),
          9,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });
      ctx.fillStyle = C.magenta;
      ctx.fillRect(dx - 8, dy - 8, 16, 16);
      ctx.fillStyle = C.teal;
      ctx.fillRect(dx - 4, dy - 4, 8, 8);

      ctx.restore();

      // throttle HUD updates
      hudTick += dt;
      if (hudTick > 0.15) {
        hudTick = 0;
        setHud({
          coverage,
          cohesion: Math.min(1, binder * (0.4 + coverage * 0.9)),
          secured: securedRef.current,
          eaten: Math.floor(eatenRef.current),
        });
      }

      // 15s milestone
      if (!firedOnce && (t - startRef.current) / 1000 >= 15) {
        firedOnce = true;
        onFifteen();
      }

      raf = requestAnimationFrame(step);
    };
    let firedOnce = false;
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binder]);

  const bar = (label: string, val: number, color: string, unit = "%") => (
    <div className="mb-3">
      <div
        className="flex justify-between font-retro text-[9px] mb-1.5"
        style={{ color: "#ffffff" }}
      >
        <span>{label}</span>
        <span style={{ color }}>
          {unit === "%" ? Math.round(val * 100) + "%" : Math.round(val)}
        </span>
      </div>
      <div
        className="h-4 border-2"
        style={{ borderColor: color, background: "rgba(0,0,0,0.4)" }}
      >
        <div
          className="h-full transition-[width] duration-150"
          style={{
            width: `${Math.min(100, unit === "%" ? val * 100 : val)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 crt-scanlines"
      style={{ background: C.bg0 }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Stat panel */}
      <div
        className="absolute top-16 left-4 border-[3px] p-3 sm:p-4 w-48 sm:w-60"
        style={{
          borderColor: C.amber,
          background: "rgba(9,13,32,0.92)",
          boxShadow:
            "0 0 16px rgba(255,207,77,0.3), 5px 5px 0 rgba(0,0,0,0.55)",
        }}
      >
        <div className="font-retro text-[10px] mb-4" style={{ color: C.amber }}>
          ◆ DEPLOYMENT ◆
        </div>
        {bar("SAND HELD", hud.coverage, C.teal)}
        {bar("COHESION", hud.cohesion, C.green)}
        {/* Head-to-head: locked cells (your score) vs crust the sand ghost has eaten */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div
            className="border-2 px-2 py-2 text-center"
            style={{ borderColor: C.green, background: "rgba(0,0,0,0.35)" }}
          >
            <div
              className="font-retro text-[7px] mb-1.5"
              style={{ color: C.green }}
            >
              ▣ SECURED
            </div>
            <div
              className="font-retro-glow text-[15px]"
              style={{ color: C.green }}
            >
              {hud.secured.toString().padStart(3, "0")}
            </div>
          </div>
          <div
            className="border-2 px-2 py-2 text-center"
            style={{ borderColor: C.sandDeep, background: "rgba(0,0,0,0.35)" }}
          >
            <div
              className="font-retro text-[7px] mb-1.5"
              style={{ color: C.sand }}
            >
              ● GHOST ATE
            </div>
            <div
              className="font-retro-glow text-[15px]"
              style={{ color: C.sand }}
            >
              {hud.eaten.toString().padStart(3, "0")}
            </div>
          </div>
        </div>
        <div
          className="font-retro text-[7px] mt-3 leading-[1.9]"
          style={{ color: "#c7d0ff" }}
        >
          LOCK CELLS FULLY (BRIGHT GREEN) BEFORE THE SAND GHOST EATS THEM.
        </div>
      </div>

      {/* Controls (keyboard hint hidden on touch; the D-pad + SPRAY button replace it) */}
      {!isTouch && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 border-[3px] px-5 py-3"
          style={{
            borderColor: C.teal,
            background: "rgba(9,13,32,0.92)",
            boxShadow: "4px 4px 0 rgba(0,0,0,0.5)",
          }}
        >
          <div className="font-retro text-[10px]" style={{ color: C.teal }}>
            WASD / ARROWS = FLY &nbsp;·&nbsp;{" "}
            <span className="retro-blink">HOLD SPACE = SPRAY</span> &nbsp;·&nbsp;{" "}
            <span style={{ color: C.sand }}>BEAT THE SAND GHOST</span>
          </div>
        </div>
      )}

      {/* Touch D-pad + SPRAY action */}
      {isTouch && (
        <TouchDpad
          keysRef={keys}
          action={{ label: "SPRAY", keyName: "space", color: C.teal }}
        />
      )}
    </div>
  );
}

// ===========================================================================
// SCENE 4b, Concentration tuning (No → Deployment)
// ===========================================================================
function TuneScene({
  pga,
  ca,
  co2,
  setPga,
  setCa,
  setCo2,
  onDeploy,
  onBack,
}: {
  pga: number;
  ca: number;
  co2: number;
  setPga: (v: number) => void;
  setCa: (v: number) => void;
  setCo2: (v: number) => void;
  onDeploy: () => void;
  onBack: () => void;
}) {
  const binder = binderStrength(pga, ca, co2);
  const slider = (
    label: string,
    val: number,
    set: (v: number) => void,
    color: string,
    unit: string,
  ) => (
    <div className="mb-7">
      <div
        className="flex justify-between font-retro text-[11px] mb-3"
        style={{ color: "#ffffff" }}
      >
        <span>{label}</span>
        <span style={{ color }}>
          {val.toFixed(1)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={val}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full retro-range"
        style={{ accentColor: color }}
      />
    </div>
  );
  return (
    <div
      className="absolute inset-0 crt-scanlines flex items-center justify-center p-5 overflow-y-auto"
      style={{
        background: `radial-gradient(circle at 50% 20%, ${C.bg1}, ${C.bg0})`,
      }}
    >
      <div
        className="w-full max-w-xl border-4 p-8 my-16"
        style={{
          borderColor: C.magenta,
          background: C.bg1,
          boxShadow:
            "0 0 26px rgba(255,94,168,0.35), 12px 12px 0 rgba(0,0,0,0.55)",
        }}
      >
        <div
          className="font-retro-glow text-[14px] mb-3"
          style={{ color: C.magenta }}
        >
          ⚙ TUNE THE FORMULA
        </div>
        <div
          className="font-retro text-[10px] mb-7 leading-[2]"
          style={{ color: "#c7d0ff" }}
        >
          Adjust the lab concentrations, the mix decides how well the drone
          locks the sand down.
        </div>
        {slider("γ-PGA POLYMER", pga, setPga, C.amber, "g/L")}
        {slider("Ca²⁺ CROSS-LINKER", ca, setCa, C.teal, "mM")}
        {slider("CARBONIC ANHYDRASE", co2, setCo2, C.purple, "U/mL")}

        <div
          className="border-2 p-4 mb-7"
          style={{ borderColor: C.green, background: "rgba(0,0,0,0.3)" }}
        >
          <div
            className="flex justify-between font-retro text-[10px] mb-3"
            style={{ color: "#ffffff" }}
          >
            <span>PREDICTED BINDING</span>
            <span style={{ color: C.green }}>{Math.round(binder * 62)}%</span>
          </div>
          <div className="h-4 border-2" style={{ borderColor: C.green }}>
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(100, binder * 62)}%`,
                background: C.green,
              }}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-between">
          <RetroButton tone="ghost" onClick={onBack}>
            ◀ BACK
          </RetroButton>
          <RetroButton tone="magenta" onClick={onDeploy}>
            DEPLOY WITH THIS MIX ▶
          </RetroButton>
        </div>
      </div>
    </div>
  );
}

/** Map three 0..100 sliders to a 0.4..~1.6 binder multiplier. */
function binderStrength(pga: number, ca: number, co2: number) {
  const n = (pga * 0.5 + ca * 0.32 + co2 * 0.18) / 100; // 0..1
  return 0.4 + n * 1.2;
}

// ===========================================================================
// Orchestrator
// ===========================================================================
export default function SandyxAdventure({
  open,
  onClose,
  onSeeModel,
  onProceedToModel,
}: SandyxAdventureProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [modelPrompt, setModelPrompt] = useState(false);
  const [droneChoice, setDroneChoice] = useState(false); // No→keep playing: show two buttons
  const [pga, setPga] = useState(65);
  const [ca, setCa] = useState(55);
  const [co2, setCo2] = useState(50);
  const isTouch = useIsTouch();

  const binder = binderStrength(pga, ca, co2);

  // Lock body scroll while open; reset on open.
  useEffect(() => {
    if (!open) return;
    setPhase("intro");
    setModelPrompt(false);
    setDroneChoice(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Halt Lenis smooth scroll so its wheel handling doesn't run under the
    // full-screen game (the game owns wheel/keys for its own scenes).
    window.__lenis?.stop();
    return () => {
      document.body.style.overflow = prev;
      window.__lenis?.start();
      // The Cursor primitive hides the native cursor; make sure it comes back.
      document.body.style.cursor = "";
    };
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Tell the persistent site chrome (theme toggle + home logo) to step aside
  // while the full-screen game is open, so it does not sit over the game's own
  // exit button in the top-right corner.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("sandyx:game", { detail: { open } }),
    );
  }, [open]);

  const isStory = phase === "intro" || phase === "storm" || phase === "desert";

  // Nobody should be forced to win a mini-game to move on. The top-bar skip is
  // always available and jumps to the next meaningful beat for the current
  // phase, so the story, the lab maze and the drone run can each be bypassed.
  // (The deploy / model prompts are their own choice overlays, so no skip there.)
  const canSkip = phase !== "deploy-prompt";
  const skipLabel = isStory ? "SKIP STORY" : "SKIP GAME";
  const skip = () => {
    if (isStory) setPhase("lab");
    else if (phase === "lab") setPhase("deploy-prompt");
    else if (phase === "lab-tune") {
      setDroneChoice(false);
      setModelPrompt(false);
      setPhase("drone");
    } else if (phase === "drone") setModelPrompt(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4"
          style={{
            background: "rgba(2,3,10,0.92)",
            backdropFilter: "blur(6px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="relative w-full h-full max-w-[1400px] overflow-hidden border-4"
            style={{
              borderColor: C.amber,
              background: C.bg0,
              boxShadow: "0 0 0 4px #1a1200, 0 30px 80px rgba(0,0,0,0.7)",
            }}
          >
            {/* Top bar. Sits above the deploy / model prompt overlays (z-70/80)
                so the exit button is always reachable. */}
            <div
              className="absolute top-0 left-0 right-0 z-[90] flex items-center justify-between px-3 py-2"
              style={{
                background:
                  "linear-gradient(180deg, rgba(11,16,38,0.9), transparent)",
              }}
            >
              <div />
              <div className="flex items-center gap-2">
                {canSkip && (
                  <button
                    onClick={skip}
                    className="btn-colored font-retro text-[9px] sm:text-[10px] px-3 py-2.5 border-2 flex items-center gap-1.5"
                    style={{
                      borderColor: C.ink,
                      color: C.ink,
                      background: "rgba(0,0,0,0.45)",
                    }}
                  >
                    <SkipForward className="w-3.5 h-3.5" /> {skipLabel}
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="btn-colored font-retro text-[9px] px-3 py-2.5 border-2 flex items-center gap-1.5"
                  style={{
                    borderColor: C.red,
                    color: C.red,
                    background: "rgba(0,0,0,0.45)",
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Themed retro cursor (motion-primitives), pointer devices only */}
            {!isTouch && (
            <Cursor
              className="z-[999]"
              springConfig={{ stiffness: 1100, damping: 34, mass: 0.28 }}
              variants={{
                initial: { scale: 0, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 0, opacity: 0 },
              }}
            >
              <div className="relative" style={{ width: 26, height: 26 }}>
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px]"
                  style={{ background: C.amber }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[2px]"
                  style={{ background: C.amber }}
                />
                <div
                  className="absolute inset-0 border-2"
                  style={{
                    borderColor: C.amber,
                    background: "rgba(255,207,77,0.12)",
                  }}
                />
              </div>
            </Cursor>
            )}

            {/* Scenes */}
            <AnimatePresence mode="wait">
              {phase === "intro" && (
                <motion.div
                  key="intro"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <IntroScene
                    onFinish={() => setPhase("desert")}
                    isTouch={isTouch}
                  />
                </motion.div>
              )}
              {phase === "desert" && (
                <motion.div
                  key="desert"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <DesertScene onFinish={() => setPhase("lab")} />
                </motion.div>
              )}
              {phase === "lab" && (
                <motion.div
                  key="lab"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <LabGame
                    onSolved={() => setPhase("deploy-prompt")}
                    isTouch={isTouch}
                  />
                </motion.div>
              )}
              {phase === "lab-tune" && (
                <motion.div
                  key="tune"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TuneScene
                    pga={pga}
                    ca={ca}
                    co2={co2}
                    setPga={setPga}
                    setCa={setCa}
                    setCo2={setCo2}
                    onBack={() => setPhase("deploy-prompt")}
                    onDeploy={() => {
                      setDroneChoice(false);
                      setModelPrompt(false);
                      setPhase("drone");
                    }}
                  />
                </motion.div>
              )}
              {phase === "drone" && (
                <motion.div
                  key="drone"
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <DroneGame
                    binder={binder}
                    onFifteen={() => setModelPrompt(true)}
                    isTouch={isTouch}
                  />
                  {/* Two-button branch after saying "No" to the model prompt */}
                  {droneChoice && (
                    <div className="absolute top-14 right-3 z-[60] flex flex-col gap-2 items-end">
                      <RetroButton tone="teal" onClick={onProceedToModel}>
                        PROCEED TO THE MODEL ▶
                      </RetroButton>
                      <RetroButton
                        tone="ghost"
                        onClick={() => {
                          setDroneChoice(false);
                          setPhase("lab");
                        }}
                      >
                        ◀ BACK TO THE LAB
                      </RetroButton>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prompt: Proceed to Deployment? */}
            <AnimatePresence>
              {phase === "deploy-prompt" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[70] flex items-center justify-center p-4"
                  style={{ background: "rgba(5,6,15,0.82)" }}
                >
                  <RetroModal title="MISSION CONTROL" accent={C.amber}>
                    <div
                      className="font-retro text-[14px] mb-8 leading-[2] text-center"
                      style={{ color: C.speech }}
                    >
                      PROCEED TO DEPLOYMENT?
                    </div>
                    <div className="flex gap-3 justify-center">
                      <RetroButton
                        tone="teal"
                        onClick={() => setPhase("drone")}
                      >
                        YES ▶
                      </RetroButton>
                      <RetroButton
                        tone="ghost"
                        onClick={() => setPhase("lab-tune")}
                      >
                        NO, TUNE MIX
                      </RetroButton>
                    </div>
                  </RetroModal>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Prompt: Would you like to see how we actually model this? */}
            <AnimatePresence>
              {phase === "drone" && modelPrompt && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[80] flex items-center justify-center p-4"
                  style={{ background: "rgba(5,6,15,0.82)" }}
                >
                  <RetroModal title="SANDYX ASKS" accent={C.teal}>
                    <div
                      className="font-retro text-[13px] mb-8 leading-[2] text-center"
                      style={{ color: C.speech }}
                    >
                      WOULD YOU LIKE TO SEE HOW WE ACTUALLY MODEL THIS?
                    </div>
                    <div className="flex gap-3 justify-center">
                      <RetroButton tone="teal" onClick={onSeeModel}>
                        YES ▶
                      </RetroButton>
                      <RetroButton
                        tone="ghost"
                        onClick={() => {
                          setModelPrompt(false);
                          setDroneChoice(true);
                        }}
                      >
                        NO, KEEP FLYING
                      </RetroButton>
                    </div>
                  </RetroModal>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
