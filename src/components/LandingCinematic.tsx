'use client';

import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent, type MotionValue } from 'motion/react';
import { Laptop, FlaskConical, Wind } from 'lucide-react';
import { Term } from './GlossaryTerm';

/**
 * LandingCinematic — "Sandyx presents"
 * ====================================
 * ONE glassy rectangular window is pinned while you scroll. Inside it, three scenes
 * (desert → dusty city → lab) sit SIDE-BY-SIDE and slide horizontally as you scroll: scroll down
 * advances Project Overview → How the models help → Lab usage; scroll up walks back to the left.
 *
 * The sandstorm is the TRANSITION: it sweeps up to a peak exactly as one pane hands off to the
 * next (and once at the very start), then abruptly clears to reveal the fresh scene + text — so
 * the space between scenes is never empty. Sandyx stands large at the window's bottom-left the
 * whole time, braced against the storm, "explaining" each pane.
 *
 * Backdrops are AI-generated stills (`/landing/*.jpg`); the storm, the horizontal choreography,
 * the mascot and the closing branch-split are all done in code (framer-motion + CSS).
 */

type Accent = 'indigo' | 'emerald' | 'amber';

const ACCENT: Record<Accent, { text: string; textLight: string; ring: string }> = {
  indigo: { text: 'text-indigo-300', textLight: 'text-indigo-600', ring: 'ring-indigo-400/30' },
  emerald: { text: 'text-emerald-300', textLight: 'text-emerald-600', ring: 'ring-emerald-400/30' },
  amber: { text: 'text-amber-300', textLight: 'text-amber-600', ring: 'ring-amber-400/30' },
};

interface Scene {
  bg: string;
  title: string;
  accent: Accent;
  glyph: 'wind' | 'laptop' | 'flask';
  paragraphs: React.ReactNode[];
}

const SCENES: Scene[] = [
  {
    bg: '/landing/desert.jpg',
    title: 'Project Overview',
    accent: 'indigo',
    glyph: 'wind',
    paragraphs: [
      <>
        This project tackles the environmental crisis of wind-driven desert sand erosion by engineering{' '}
        <Term k="bacillus-subtilis"><i>Bacillus subtilis</i></Term> to biologically stabilize sandy surfaces.
      </>,
      <>
        We employ a three-pronged synthetic biology approach to maximize soil cohesion, utilize native desert
        resources, and ensure strict <Term k="kill-switch">biosafety</Term>.
      </>,
      <>
        By binding loose particulate matter into a durable <Term k="gamma-pga">γ-PGA</Term> crust, we aim to
        significantly reduce airborne dust and improve regional air quality.
      </>,
    ],
  },
  {
    bg: '/landing/city.jpg',
    title: 'How do these models help?',
    accent: 'emerald',
    glyph: 'laptop',
    paragraphs: [
      <>
        These computational models bridge the gap between microscopic bacterial behaviors and macroscopic
        environmental impact.
      </>,
      <>
        They let researchers simulate polymer <Term k="cross-linking">cross-linking</Term> dynamics, optimize
        metabolic pathways with <Term k="flux-balance-analysis">flux balance analysis</Term>, and predict the
        real-world <Term k="aeolian-transport">aeolian</Term> stress resistance of treated sand — before touching a
        single flask.
      </>,
    ],
  },
  {
    bg: '/landing/lab.jpg',
    title: 'How to use this toolkit in the lab',
    accent: 'amber',
    glyph: 'flask',
    paragraphs: [
      <>
        Use this suite to fine-tune your wet lab parameters — incubation temperature,{' '}
        <Term k="precursor">precursor</Term> concentrations, and <Term k="od600">inoculum</Term> volumes.
      </>,
      <>
        The simulated outputs guide exact experimental setups, so you hit the optimal{' '}
        <Term k="shear-modulus">shear modulus</Term> and environmental durability in your physical assays.
      </>,
    ],
  },
];

const GLYPH = { wind: Wind, laptop: Laptop, flask: FlaskConical };

// ---------------------------------------------------------------------------
// Sandstorm veil — opacity/height driven by `intensity`; peaks hide the pane hand-off.
// ---------------------------------------------------------------------------
const DUST_LAYERS = [
  { top: '6%', h: '80%', dur: 4.5, dist: 140, blur: 16, tint: 'rgba(214,178,120,0.6)' },
  { top: '26%', h: '70%', dur: 7, dist: 210, blur: 26, tint: 'rgba(196,158,104,0.55)' },
  { top: '-4%', h: '92%', dur: 6, dist: 175, blur: 36, tint: 'rgba(232,205,158,0.45)' },
];

function Sandstorm({ intensity }: { intensity: MotionValue<number> }) {
  const veilOpacity = useTransform(intensity, [0, 1], [0, 1]);
  const wallY = useTransform(intensity, [0, 1], [50, -14]);
  const groupOpacity = useTransform(intensity, [0, 0.04, 1], [0, 0.25, 1]);
  return (
    <motion.div className="pointer-events-none absolute inset-0 z-30" style={{ opacity: groupOpacity }}>
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: veilOpacity,
          background:
            'linear-gradient(180deg, rgba(170,137,88,1) 0%, rgba(198,164,108,0.94) 45%, rgba(220,190,138,0.82) 100%)',
        }}
      />
      <motion.div className="absolute inset-0 overflow-hidden" style={{ y: wallY }}>
        {DUST_LAYERS.map((d, i) => (
          <motion.div
            key={i}
            className="absolute left-[-30%] w-[160%]"
            style={{
              top: d.top,
              height: d.h,
              filter: `blur(${d.blur}px)`,
              background: `radial-gradient(ellipse 40% 60% at 20% 50%, ${d.tint}, transparent 70%), radial-gradient(ellipse 35% 55% at 60% 45%, ${d.tint}, transparent 70%), radial-gradient(ellipse 45% 50% at 85% 55%, ${d.tint}, transparent 72%)`,
            }}
            animate={{ x: [0, d.dist] }}
            transition={{ duration: d.dur, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// One horizontal pane (background + presented text). Text sits to the right of Sandyx.
// ---------------------------------------------------------------------------
function Pane({ scene, isLightMode }: { scene: Scene; isLightMode: boolean }) {
  const a = ACCENT[scene.accent];
  return (
    <div className="relative shrink-0 w-1/3 h-full overflow-hidden">
      <img src={scene.bg} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full object-cover scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/25" />
      {/* presented text — full-width top on mobile, right-hand card on desktop */}
      <div className="absolute z-20 left-3 right-3 top-16 sm:left-auto sm:top-1/2 sm:-translate-y-1/2 sm:right-[5%] sm:w-[54%] sm:max-w-lg">
        <div
          className={`rounded-3xl border p-5 sm:p-7 backdrop-blur-xl shadow-2xl ring-1 ${a.ring} ${
            isLightMode ? 'bg-white/75 border-white/70 text-slate-900' : 'bg-slate-950/62 border-white/10 text-slate-100'
          }`}
        >
          <h2 className={`text-lg sm:text-2xl font-black uppercase tracking-widest mb-3 ${isLightMode ? a.textLight : a.text}`}>
            {scene.title}
          </h2>
          <div className="space-y-2.5 text-[13px] sm:text-base leading-relaxed opacity-90">
            {scene.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The pinned, horizontally-sliding cinematic
// ---------------------------------------------------------------------------
export default function LandingCinematic({ isLightMode }: { isLightMode: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);

  // Horizontal track: dwell on a pane, then swipe (behind the storm) to the next.
  const trackX = useTransform(
    scrollYProgress,
    [0, 0.29, 0.41, 0.62, 0.74, 1],
    ['0%', '0%', '-33.333%', '-33.333%', '-66.666%', '-66.666%'],
  );
  // Storm: covers the intro reveal + each hand-off (with a brief full-cover plateau), calm on dwells.
  const storm = useTransform(
    scrollYProgress,
    [0, 0.07, 0.29, 0.34, 0.36, 0.41, 0.62, 0.67, 0.69, 0.74],
    [1, 0, 0, 1, 1, 0, 0, 1, 1, 0],
  );
  // Window entrance / hand-off to the prongs.
  const winScale = useTransform(scrollYProgress, [0, 0.05, 0.96, 1], [0.9, 1, 1, 0.95]);
  const winOpacity = useTransform(scrollYProgress, [0, 0.04, 0.98, 1], [0, 1, 1, 0.9]);
  const winY = useTransform(scrollYProgress, [0, 0.05], [70, 0]);
  // Sandyx braces into each storm peak.
  const sandyxRot = useTransform(storm, [0, 1], [0, 8]);
  const sandyxX = useTransform(storm, [0, 1], [0, 12]);

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = p < 0.37 ? 0 : p < 0.70 ? 1 : 2;
    setActive((cur) => (cur === next ? cur : next));
  });

  const activeScene = SCENES[active];
  const ActiveGlyph = GLYPH[activeScene.glyph];
  const a = ACCENT[activeScene.accent];

  return (
    <div id="cinematic" ref={ref} className="relative h-[360vh]">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden px-4">
        <motion.div
          style={{ y: winY, scale: winScale, opacity: winOpacity }}
          className={`relative w-full max-w-5xl aspect-[3/4] sm:aspect-[16/9] rounded-[2rem] overflow-hidden border shadow-2xl ring-1 ${a.ring} ${
            isLightMode ? 'border-white/70' : 'border-white/10'
          }`}
        >
          {/* horizontal track of scenes */}
          <motion.div className="absolute inset-0 z-10 flex h-full w-[300%]" style={{ x: trackX }}>
            {SCENES.map((s) => (
              <Pane key={s.bg} scene={s} isLightMode={isLightMode} />
            ))}
          </motion.div>

          {/* the sandstorm transition */}
          <Sandstorm intensity={storm} />

          {/* glassy frame edge — echoes the SandyxOverlay pop-up */}
          <div
            className="pointer-events-none absolute inset-0 z-40 rounded-[2rem]"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 0 70px rgba(0,0,0,0.4)' }}
          />

          {/* Sandyx — large, bottom-left, presenting; braced against the storm */}
          <motion.div style={{ rotate: sandyxRot, x: sandyxX }} className="absolute z-40 left-[1%] sm:left-[3%] bottom-0 origin-bottom">
            <motion.img
              src="/sandyx.png"
              alt="Sandyx"
              draggable={false}
              className="w-28 sm:w-52 md:w-60 object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.5)]"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* scene chip (top-left) */}
          <div className="absolute z-50 top-5 left-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/15">
            <ActiveGlyph className="w-3.5 h-3.5 text-white/90" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/90">{activeScene.title}</span>
          </div>

          {/* pane dots (bottom-right) */}
          <div className="absolute z-50 bottom-5 right-6 flex items-center gap-2">
            {SCENES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/45'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branch-split connector — grows from the centre into three roots above the prong cards.
// ---------------------------------------------------------------------------
export function BranchConnector({ isLightMode: _isLightMode }: { isLightMode: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.55'] });
  const draw = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const nodeOpacity = useTransform(scrollYProgress, [0.6, 1], [0, 1]);

  return (
    <div ref={ref} className="relative w-full h-24 sm:h-32 -mb-2">
      <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="branchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        <motion.path d="M500 0 L500 70" fill="none" stroke="url(#branchGrad)" strokeWidth="3" strokeLinecap="round" style={{ pathLength: draw }} />
        {['M500 70 C500 140, 210 120, 167 200', 'M500 70 L500 200', 'M500 70 C500 140, 790 120, 833 200'].map((d, i) => (
          <motion.path key={i} d={d} fill="none" stroke="url(#branchGrad)" strokeWidth="3" strokeLinecap="round" style={{ pathLength: draw }} />
        ))}
        {[167, 500, 833].map((x, i) => (
          <motion.circle key={i} cx={x} cy={198} r={6} fill="#22d3ee" style={{ opacity: nodeOpacity }} />
        ))}
      </svg>
    </div>
  );
}
