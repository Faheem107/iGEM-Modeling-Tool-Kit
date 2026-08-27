import React, { useMemo } from "react";
import { DUNE, TINT } from "@/src/lib/palette";
import {
  dunePath,
  backGrains,
  speckle,
  polymerBridges,
  blobPath,
  blend,
  crustBed,
  saltation,
  windStreaks,
  CRUST_HORIZON,
  type Grain,
} from "@/src/lib/dune-story/geometry";

const C = {
  sand: DUNE.orange,
  sandDeep: TINT.orangeDeep,
  cured: DUNE.teal,
  teal: TINT.tealDeep,
  mesh: DUNE.rose,
};

// Every scene is lit from the upper left. Highlights, terminators and contact
// shadows all follow this one vector.
const LIGHT = { x: -0.42, y: -0.5 };

const frame = "absolute inset-0 h-full w-full";

// The beats hold the left of the frame, so the subject of every scene is
// carried into the right of it. A group transform rather than a viewBox offset,
// so the full-bleed backgrounds still reach both edges.
const SUBJECT = "translate(230 0)";

// The wind runs on its own clock; --wind is the only part of it the scroll
// sets, so the same streaks carry the calm of the hero and the threshold of
// beat 1.
function Wind({ y0, y1, colour }: { y0: number; y1: number; colour: string }) {
  const streaks = useMemo(() => windStreaks(y0, y1), [y0, y1]);
  return (
    <g fill="none" stroke={colour} strokeLinecap="round" style={{ opacity: "var(--wind, 0)" }}>
      {streaks.map((w, i) => (
        <path
          key={i}
          className="story-wind"
          d={w.d}
          strokeWidth={w.width}
          style={
            {
              "--gust": `${w.gust}px`,
              animationDelay: `${w.delay}s`,
              opacity: w.fade,
            } as React.CSSProperties
          }
        />
      ))}
    </g>
  );
}

export function FieldScene({ isLightMode }: { isLightMode: boolean }) {
  const ridges = useMemo(
    () =>
      [
        [352, 22, 300, 0.4],
        [430, 34, 250, 2.1],
        [530, 46, 210, 4.3],
        [656, 58, 175, 1.2],
      ].map(([b, a, w, p]) => dunePath(b, a, w, p)),
    [],
  );
  const tone = isLightMode
    ? ["#e3cba2", "#dfbe8c", "#d6ac72", "#c8965a"]
    : ["#241a12", "#2c2015", "#352618", "#3f2c1b"];
  const lit = isLightMode ? "#f7e6c4" : "#5c4025";
  const hops = useMemo(() => saltation(), []);

  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className={frame} aria-hidden>
      <defs>
        {ridges.map((_, i) => (
          <linearGradient key={i} id={`ls-ridge-${i}`} x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0%" stopColor={lit} stopOpacity={0.5 + i * 0.1} />
            <stop offset="18%" stopColor={tone[i]} />
            <stop offset="100%" stopColor={tone[i]} />
          </linearGradient>
        ))}
        <filter id="ls-ridge-shadow" x="-10%" y="-30%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      {ridges.map((d, i) => (
        <g key={i}>
          <path
            d={d}
            fill="#0d0805"
            opacity={isLightMode ? 0.1 : 0.34}
            filter="url(#ls-ridge-shadow)"
            transform="translate(26 22)"
          />
          <path d={d} fill={`url(#ls-ridge-${i})`} />
          <path d={d} fill="none" stroke={lit} strokeWidth="1.4" opacity={isLightMode ? 0.5 : 0.3} />
        </g>
      ))}

      <Wind y0={300} y1={620} colour={lit} />

      {/* Grains hopping along the near ridge. They are what the beat is about,
          so they arrive with it rather than with the frame. */}
      <g fill={isLightMode ? "#f7e6c4" : "#c99a5e"} style={{ opacity: "var(--lift, 0)" }}>
        {hops.map((h, i) => (
          <g
            key={i}
            className="story-hop"
            style={{ "--hop-x": `${h.dx}px`, animationDelay: `${h.delay}s` } as React.CSSProperties}
          >
            <g style={{ "--hop-y": `${h.dy}px` } as React.CSSProperties}>
              <circle cx={h.x} cy={h.y} r={h.r} />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function GrainScene({
  isLightMode,
  grains,
  bridges,
  lattice,
}: {
  isLightMode: boolean;
  grains: Grain[];
  bridges: ReturnType<typeof polymerBridges>;
  lattice: { x: number; y: number }[];
}) {
  const hero = grains[0];
  const mid = grains.slice(1);
  const back = useMemo(() => backGrains(), []);
  const grit = useMemo(() => speckle(hero.cx, hero.cy, hero.r, 130, 17), [hero]);
  // Shadows fall away from the light, a little longer than it is high.
  const sx = -LIGHT.x * 34;
  const sy = -LIGHT.y * 30;

  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className={frame} aria-hidden>
      <defs>
        <radialGradient id="ls-field" cx="50%" cy="38%" r="82%">
          {isLightMode ? (
            <>
              <stop offset="0%" stopColor="#eef6f2" />
              <stop offset="52%" stopColor="#cfe4dd" />
              <stop offset="100%" stopColor="#9dbfb5" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#123029" />
              <stop offset="52%" stopColor="#0a1c18" />
              <stop offset="100%" stopColor="#04100e" />
            </>
          )}
        </radialGradient>
        <radialGradient id="ls-bounce" cx="50%" cy="100%" r="66%">
          <stop offset="0%" stopColor={C.sand} stopOpacity={isLightMode ? 0.3 : 0.22} />
          <stop offset="100%" stopColor={C.sand} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ls-vignette" cx="50%" cy="46%" r="72%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity={isLightMode ? 0.16 : 0.5} />
        </radialGradient>

        <radialGradient id="ls-grain" cx="33%" cy="27%" r="86%">
          <stop offset="0%" stopColor="#f6d8a8" />
          <stop offset="26%" stopColor="#e8b276" />
          <stop offset="60%" stopColor={C.sand} />
          <stop offset="86%" stopColor={C.sandDeep} />
          <stop offset="100%" stopColor="#7d4a1d" />
        </radialGradient>
        <radialGradient id="ls-grain-far" cx="36%" cy="30%" r="88%">
          <stop offset="0%" stopColor="#a5865f" />
          <stop offset="60%" stopColor="#7d5c3a" />
          <stop offset="100%" stopColor="#4a301a" />
        </radialGradient>
        <radialGradient id="ls-haze" cx="50%" cy="38%" r="82%">
          <stop offset="0%" stopColor={isLightMode ? "#cfe4dd" : "#0a1c18"} stopOpacity="0.55" />
          <stop offset="100%" stopColor={isLightMode ? "#9dbfb5" : "#04100e"} stopOpacity="0.72" />
        </radialGradient>
        <linearGradient id="ls-cell" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={isLightMode ? "#8ecfc0" : "#7fcbba"} />
          <stop offset="55%" stopColor={isLightMode ? "#5fa89b" : "#57a294"} />
          <stop offset="100%" stopColor={isLightMode ? "#3d7d72" : "#2f6a60"} />
        </linearGradient>
        <linearGradient id="ls-rim" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={DUNE.rose} stopOpacity="0.85" />
          <stop offset="42%" stopColor={DUNE.rose} stopOpacity="0" />
        </linearGradient>

        <filter id="ls-far-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id="ls-shadow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <clipPath id="ls-hero-clip">
          <path d={hero.path} />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="1200" height="800" fill="url(#ls-field)" />
      <rect x="0" y="0" width="1200" height="800" fill="url(#ls-bounce)" />

      <g transform={SUBJECT}>
      {/* Back ring: blurred and dimmed, it fills the voids the front cluster
          leaves so the scene has a floor. */}
      <g filter="url(#ls-far-blur)" opacity={isLightMode ? 0.42 : 0.3}>
        {back.map((g, i) => (
          <path key={i} d={g.path} fill="url(#ls-grain-far)" />
        ))}
      </g>

      <g filter="url(#ls-shadow)" opacity={isLightMode ? 0.3 : 0.55}>
        {grains.map((g, i) => (
          <path key={i} d={g.path} fill="#1a0e05" transform={`translate(${sx} ${sy})`} />
        ))}
      </g>

      {/* The polymer sits behind the grains it anchors into. */}
      <g fill="none" stroke={C.mesh} strokeWidth="5" strokeLinecap="round">
        {bridges.map((b, i) => (
          <path key={i} className="ls-bridge" d={b.path} opacity={0.9} />
        ))}
      </g>

      <g>
        {mid.map((g, i) => (
          <g key={i} opacity={0.9 - (i % 3) * 0.06}>
            <path d={g.path} fill="url(#ls-grain)" />
            <path d={g.path} fill="url(#ls-haze)" opacity={isLightMode ? 0.2 : 0.3} />
            <path d={g.path} fill="url(#ls-rim)" opacity="0.4" />
            <path d={g.path} fill="none" stroke={C.sandDeep} strokeWidth="1" opacity="0.4" />
          </g>
        ))}
      </g>

      {/* The one focal grain: the only one carrying grit, lattice and a full rim. */}
      <g>
        <path d={hero.path} fill="url(#ls-grain)" />
        <g clipPath="url(#ls-hero-clip)">
          <g fill="#6b3d13" opacity={isLightMode ? 0.2 : 0.26}>
            {grit.map((p, i) => (i % 2 === 0 ? <circle key={i} cx={p.x} cy={p.y} r={p.r} /> : null))}
          </g>
          <g fill="#ffe4bb" opacity={isLightMode ? 0.24 : 0.2}>
            {grit.map((p, i) =>
              i % 2 === 1 ? <circle key={i} cx={p.x - 1} cy={p.y - 1} r={p.r * 0.8} /> : null,
            )}
          </g>
          <g opacity={isLightMode ? 0.34 : 0.42}>
            {lattice.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff3d8" opacity="0.7" />
            ))}
            {lattice.map((p, i) =>
              i % 2 === 0 ? (
                <line
                  key={`l${i}`}
                  x1={p.x}
                  y1={p.y}
                  x2={p.x + 44}
                  y2={p.y}
                  stroke="#fff3d8"
                  strokeWidth="1"
                  opacity="0.3"
                />
              ) : null,
            )}
          </g>
        </g>
        <path d={hero.path} fill="url(#ls-rim)" opacity="0.75" />
        <path d={hero.path} fill="none" stroke={C.sandDeep} strokeWidth="1.4" opacity="0.7" />
      </g>

      <g>
        {bridges.map((b, i) => (
          <g key={i}>
            <circle
              className="ls-node"
              cx={b.ax}
              cy={b.ay}
              r="8"
              fill={C.cured}
              style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
            />
            <circle
              className="ls-node"
              cx={b.bx}
              cy={b.by}
              r="8"
              fill={C.cured}
              style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
            />
          </g>
        ))}
      </g>

      {/* B. subtilis sitting on the focal grain, with the enzyme already
          studding its wall, which is what the next beat opens on. */}
      <g transform="translate(600 410) rotate(-18)">
        <rect
          x="-92"
          y="-30"
          width="184"
          height="60"
          rx="30"
          fill="#1a0e05"
          opacity={isLightMode ? 0.22 : 0.42}
          transform={`translate(${sx * 0.45} ${sy * 0.45})`}
        />
        <rect x="-92" y="-30" width="184" height="60" rx="30" fill="url(#ls-cell)" />
        <rect
          x="-92"
          y="-30"
          width="184"
          height="60"
          rx="30"
          fill="none"
          stroke={isLightMode ? "#d9efe8" : "#bfe3d9"}
          strokeWidth="2.5"
          opacity="0.75"
        />
        <path
          d="M-92 0 Q-92 30 -62 30 L62 30 Q92 30 92 0"
          fill="none"
          stroke={C.teal}
          strokeWidth="3"
          opacity="0.65"
        />
        <ellipse cx="-30" cy="-1" rx="27" ry="15" fill={C.teal} opacity="0.42" />
        <ellipse cx="38" cy="-3" rx="23" ry="13" fill={C.teal} opacity="0.38" />
        <g fill={isLightMode ? "#f2fbf8" : "#dff2ec"} opacity="0.8">
          {[-58, -36, -14, 8, 30, 52].map((x, i) => (
            <circle key={i} cx={x} cy={i % 2 === 0 ? -27 : 27} r="4" />
          ))}
        </g>
      </g>
      </g>

      <rect x="0" y="0" width="1200" height="800" fill="url(#ls-vignette)" />
    </svg>
  );
}

// One parabola, sampled, so the ticks, the anchor and the calcite all stand on
// the same curve the line draws. Sampled rather than a quadratic Bézier because
// the wall is carried right with the rest of the subject and still has to reach
// past both edges of the frame.
const wallY = (x: number) => {
  const u = (x - 600) / 640;
  return 690 - 124 * (1 - u * u);
};

const wallPath = (dy: number) => {
  let d = "";
  for (let x = -520; x <= 1720; x += 80) {
    d += `${d ? " L" : "M"}${x} ${Math.round(wallY(x) + dy)}`;
  }
  return d;
};

const WALL = wallPath(0);
const MEMBRANE = wallPath(38);

const ENZYME_X = 600;
const ENZYME_Y = 372;
const ENZYME_R = 92;

export function EnzymeScene({ isLightMode }: { isLightMode: boolean }) {
  const co2 = useMemo(
    () =>
      [0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.55, 0.64, 0.73, 0.82, 0.91, 1].map((f, i) => {
        const x = Math.round(-300 + f * 1420);
        return { x, delay: ((i * 2.3) % 6.9).toFixed(2), converge: ENZYME_X - x };
      }),
    [],
  );

  // Calcite grows outward from the anchor, so the rhombs nearest it start
  // first. Sizes and stand-off vary because an even row of equal squares reads
  // as a border drawn on the wall, not as mineral coming out of solution.
  const rhombs = useMemo(() => {
    const spread = [
      -472, -438, -400, -366, -338, -300, -268, -242, -208, -178, -150, -118,
      -92, -64, -38, 40, 74, 112, 158, 206, 262,
    ];
    return spread.map((dx, i) => {
      const x = ENZYME_X + dx;
      const r = 5 + ((i * 11) % 9);
      const lift = ((i * 7) % 5) * 2.5;
      return {
        x,
        y: Math.round(wallY(x) - r * 0.5 - lift),
        r,
        tilt: -28 + ((i * 41) % 56),
        start: 0.04 + Math.abs(dx) / 760,
      };
    });
  }, []);

  const body = useMemo(() => blobPath(ENZYME_X, ENZYME_Y, ENZYME_R, 23, 16, 0.1), []);
  const core = useMemo(() => blobPath(ENZYME_X + 8, ENZYME_Y + 10, ENZYME_R * 0.6, 71, 14, 0.14), []);
  const ink = isLightMode ? "#3d7d72" : "#8fd3c2";

  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className={frame} aria-hidden>
      <defs>
        <linearGradient id="ls-cyto" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={isLightMode ? "#7cc4b4" : "#3f8d80"} />
          <stop offset="100%" stopColor={isLightMode ? "#3d7d72" : "#16443d"} />
        </linearGradient>
        <linearGradient id="ls-solution" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.sand} stopOpacity="0" />
          <stop offset="100%" stopColor={C.sand} stopOpacity={isLightMode ? 0.2 : 0.14} />
        </linearGradient>
        <radialGradient id="ls-enzyme" cx="34%" cy="26%" r="84%">
          <stop offset="0%" stopColor={isLightMode ? "#d5efe7" : "#b7e6d8"} />
          <stop offset="40%" stopColor={isLightMode ? "#8ecfc0" : "#6fbcab"} />
          <stop offset="100%" stopColor={isLightMode ? "#3d7d72" : "#215c53"} />
        </radialGradient>
        <radialGradient id="ls-ca-vignette" cx="50%" cy="42%" r="70%">
          <stop offset="52%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity={isLightMode ? 0.18 : 0.55} />
        </radialGradient>
      </defs>

      <path d="M -40 300 L 1240 300 L 1240 800 L -40 800 Z" fill="url(#ls-solution)" />

      <g transform={SUBJECT}>
      <path
        d={`${MEMBRANE} L 1720 900 L -520 900 Z`}
        fill="url(#ls-cyto)"
        style={{ opacity: "calc(var(--ca-draw, 0) * 0.7)" }}
      />
      {/* pathLength=1 keeps the dash in normalised units, so the slice
          transform cannot pull the dash and the geometry out of step. */}
      <g fill="none" stroke={ink} style={{ strokeDashoffset: "calc(1 - var(--ca-draw, 0))" }}>
        <path d={WALL} pathLength={1} strokeDasharray={1} strokeWidth="3.6" opacity="0.95" />
        <path d={MEMBRANE} pathLength={1} strokeDasharray={1} strokeWidth="2.2" opacity="0.55" />
      </g>

      {/* Peptidoglycan as ticks rather than a texture fill: a drawn strand
          would have to be some width, and at this scale we do not know it. */}
      <g stroke={ink} strokeWidth="1.7" style={{ opacity: "calc(0.4 * var(--ca-draw, 0))" }}>
        {Array.from({ length: 51 }, (_, i) => {
          const x = -500 + i * 44;
          const y = wallY(x);
          return <line key={i} x1={x} y1={y + 4} x2={x} y2={y + 34} />;
        })}
      </g>

      {/* Sortase stitches the enzyme to the wall covalently, so it gets a stem
          rather than a gap. */}
      <g style={{ opacity: "var(--ca-draw, 0)" }}>
        <line
          x1={ENZYME_X}
          y1={wallY(ENZYME_X)}
          x2={ENZYME_X}
          y2={ENZYME_Y + ENZYME_R - 8}
          stroke={DUNE.rose}
          strokeWidth="4"
        />
        <circle cx={ENZYME_X} cy={wallY(ENZYME_X)} r="8" fill={DUNE.rose} />
        <circle
          cx={ENZYME_X}
          cy={wallY(ENZYME_X)}
          r="15"
          fill="none"
          stroke={DUNE.rose}
          strokeWidth="1.6"
          opacity="0.45"
        />
      </g>

      {/* Carbonic anhydrase: a globular body with a cleft open to the solution
          and the catalytic zinc at the bottom of it. */}
      <g style={{ opacity: "var(--ca-draw, 0)" }}>
        <path d={body} fill="url(#ls-enzyme)" />
        <path d={core} fill={ink} opacity="0.18" />
        <path
          d={`M ${ENZYME_X - 34} ${ENZYME_Y - ENZYME_R + 6}
              Q ${ENZYME_X - 6} ${ENZYME_Y - 20} ${ENZYME_X} ${ENZYME_Y - 4}
              Q ${ENZYME_X + 8} ${ENZYME_Y - 22} ${ENZYME_X + 30} ${ENZYME_Y - ENZYME_R + 2} Z`}
          fill={isLightMode ? "#2c5f57" : "#0f332d"}
          opacity="0.55"
        />
        <circle cx={ENZYME_X} cy={ENZYME_Y - 6} r="9" fill={DUNE.orange} />
        <circle
          cx={ENZYME_X}
          cy={ENZYME_Y - 6}
          r="16"
          fill="none"
          stroke={DUNE.orange}
          strokeWidth="1.4"
          opacity="0.4"
        />
        <path d={body} fill="none" stroke={isLightMode ? "#f2fbf8" : "#cdeee4"} strokeWidth="1.6" opacity="0.5" />
      </g>

      {/* O=C=O, three dots. The position is an attribute on the outer group and
          the fall is a CSS animation on the inner one: a CSS transform would
          otherwise override the attribute and stack every molecule at x=0. */}
      <g>
        {co2.map((m, i) => (
          <g key={i} transform={`translate(${m.x} 0)`}>
            <g
              className="ca-gas-mol"
              style={
                { "--ca-x": `${m.converge}px`, animationDelay: `${m.delay}s` } as React.CSSProperties
              }
              fill={ink}
            >
              <circle cx="-11" cy="0" r="3.6" />
              <circle cx="0" cy="0" r="5" />
              <circle cx="11" cy="0" r="3.6" />
            </g>
          </g>
        ))}
      </g>

      {/* Calcite, in the rhombic habit it actually grows in, arriving from the
          anchor outwards. */}
      <g
        style={{
          transform: "scale(calc(0.36 + 0.64 * var(--ca-grow, 0)))",
          transformOrigin: "600px 640px",
        }}
      >
        {rhombs.map((r, i) => (
          <rect
            key={i}
            x={r.x - r.r}
            y={r.y - r.r}
            width={r.r * 2}
            height={r.r * 2}
            fill={C.sand}
            stroke={C.sandDeep}
            strokeWidth="1.1"
            transform={`rotate(${r.tilt} ${r.x} ${r.y})`}
            style={{ opacity: `calc((var(--ca-grow, 0) - ${r.start.toFixed(3)}) * 6)` }}
          />
        ))}
      </g>
      </g>

      <rect x="0" y="0" width="1200" height="800" fill="url(#ls-ca-vignette)" />
    </svg>
  );
}

export function CrustScene({ isLightMode }: { isLightMode: boolean }) {
  const bed = useMemo(() => crustBed(), []);
  // The two ridges the story opened on, now on the far side of the crust.
  const far = useMemo(() => [dunePath(238, 15, 340, 1.1), dunePath(272, 11, 260, 3.4)], []);
  const sx = -LIGHT.x * 16;
  const sy = -LIGHT.y * 12;
  const ground = isLightMode ? "#e6cb99" : "#2b1f15";

  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className={frame} aria-hidden>
      <defs>
        <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
          {isLightMode ? (
            <>
              <stop offset="0%" stopColor="#e4f0ec" />
              <stop offset="62%" stopColor="#f3e6cd" />
              <stop offset="100%" stopColor="#e6cb99" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#0c1815" />
              <stop offset="62%" stopColor="#1d150f" />
              <stop offset="100%" stopColor="#2b1f15" />
            </>
          )}
        </linearGradient>
        <radialGradient id="ls-sun" cx="26%" cy="33%" r="42%">
          <stop offset="0%" stopColor={isLightMode ? "#fff2d2" : "#c98a45"} stopOpacity={isLightMode ? 0.62 : 0.4} />
          <stop offset="100%" stopColor={isLightMode ? "#fff2d2" : "#c98a45"} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ls-crust-grain" cx="33%" cy="27%" r="86%">
          <stop offset="0%" stopColor="#f6d8a8" />
          <stop offset="30%" stopColor="#e8b276" />
          <stop offset="70%" stopColor={C.sand} />
          <stop offset="100%" stopColor={C.sandDeep} />
        </radialGradient>
        <linearGradient id="ls-far-bed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={blend(C.sand, ground, 0.94)} />
          <stop offset="55%" stopColor={blend(C.sand, ground, 0.82)} />
          <stop offset="100%" stopColor={blend(C.sand, ground, 0.72)} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ls-crust-vignette" cx="50%" cy="52%" r="74%">
          <stop offset="52%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity={isLightMode ? 0.14 : 0.48} />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="1200" height="800" fill="url(#ls-sky)" />
      <rect x="0" y="0" width="1200" height="800" fill="url(#ls-sun)" />

      <g>
        {far.map((d, i) => (
          <path key={i} d={d} fill={blend(C.sand, ground, i ? 0.8 : 0.88)} />
        ))}
      </g>

      {/* Past the last row a grain is under a pixel, so the bed carries on as
          a band rather than as shapes we cannot honestly draw. */}
      <rect
        x="0"
        y={CRUST_HORIZON - 2}
        width="1200"
        height={bed[0].grains[0].cy - CRUST_HORIZON + 80}
        fill="url(#ls-far-bed)"
      />

      {/* The same grains as the beat before, seen from far enough back that the
          cluster has become ground. The front row is the size the cluster was
          when the camera left it. */}
      {bed.map((row, j) => {
        const haze = Math.min(0.9, 1 - row.depth);
        return (
          <g key={j}>
            {row.grains.map((g, i) =>
              g.path ? (
                <g key={i}>
                  <path
                    d={g.path}
                    fill="#1a0e05"
                    opacity={isLightMode ? 0.14 : 0.3}
                    transform={`translate(${sx * row.depth} ${sy * row.depth})`}
                  />
                  <path d={g.path} fill="url(#ls-crust-grain)" />
                  <path d={g.path} fill={ground} opacity={haze} />
                </g>
              ) : (
                <circle
                  key={i}
                  cx={g.cx}
                  cy={g.cy}
                  r={g.r}
                  fill={blend(C.sand, ground, haze)}
                />
              ),
            )}
            <g fill={C.cured} opacity={0.85 - haze * 0.5}>
              {row.joins.map((n, i) => (
                <circle key={i} cx={n.x} cy={n.y} r={n.r} />
              ))}
            </g>
          </g>
        );
      })}

      <Wind y0={330} y1={640} colour={isLightMode ? "#fff2d2" : "#8a6a44"} />

      <rect x="0" y="0" width="1200" height="800" fill="url(#ls-crust-vignette)" />
    </svg>
  );
}
