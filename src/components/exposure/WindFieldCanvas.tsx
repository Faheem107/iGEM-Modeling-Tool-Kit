"use client";

import { useEffect, useRef } from "react";
import { EXTENT, H, W, project } from "./mapExtent";
import { sampleField, type WindField } from "@/src/lib/windField";
import { DUNE } from "@/src/lib/palette";

/**
 * The moving wind field, drawn as particle trails over the map.
 *
 * Every particle is a massless tracer advected by the interpolated 10 m wind.
 * Instead of clearing the canvas each frame we paint a low-alpha wash over it,
 * so each tracer leaves a tail that fades over roughly a second. That is what
 * turns a field of dots into streamlines, and it is why the trail alpha and the
 * particle lifetime are the two numbers to touch if the look needs changing.
 *
 * Canvas rather than SVG because this is hundreds of moving primitives at 60
 * fps; the map's own SVG stays declarative underneath. No dependency: there is
 * no map or d3 library in this repo and none is needed for a fixed extent.
 *
 * Follows the loop discipline of src/components/dune-story/SandParticles.tsx:
 * one rAF loop that never re-renders React, paused by IntersectionObserver when
 * off-screen, and skipped entirely under prefers-reduced-motion.
 */

/** Particles are respawned on a random age so the field never pulses in step. */
const LIFE_MIN = 70;
const LIFE_RANGE = 130;

/**
 * Degrees travelled per second at 1 m/s.
 *
 * Not physical, and deliberately so: at true scale a 5 m/s wind crosses this
 * 1,600 km map in about four days, which on screen is a stationary dot. The
 * number is set so a typical Gulf wind draws a legible streak, and speed is
 * read from the colour ramp, not from how fast the tracers move.
 */
const SPEED_SCALE = 0.36;

/**
 * How fast an old trail fades, as alpha erased per frame. Together with
 * SPEED_SCALE this sets the visible streak length: roughly 1/TRAIL_FADE frames
 * of travel, so about 18 frames here.
 */
const TRAIL_FADE = 0.055;

/** Wind speeds the colour ramp spans, m/s at 10 m. */
const CALM = 2;
const GALE = 14;

interface Tracer {
  lon: number;
  lat: number;
  age: number;
  life: number;
}

function lerpHex(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

/** Calm to gale on the dune accents: teal, orange, rose. Never a rainbow. */
function speedColor(speed: number) {
  const t = Math.min(1, Math.max(0, (speed - CALM) / (GALE - CALM)));
  return t < 0.5
    ? lerpHex(DUNE.teal, DUNE.orange, t * 2)
    : lerpHex(DUNE.orange, DUNE.rose, (t - 0.5) * 2);
}

export default function WindFieldCanvas({
  field,
  isLightMode,
  className = "",
}: {
  /** Null while loading, or when there is no field to draw. */
  field: WindField | null;
  isLightMode: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The loop reads the field through a ref, so a new month or a new live
  // reading swaps the vectors without tearing down the particles.
  const fieldRef = useRef<WindField | null>(field);
  fieldRef.current = field;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let dpr = 1;

    const spawn = (t: Tracer) => {
      t.lon = EXTENT.lonMin + Math.random() * (EXTENT.lonMax - EXTENT.lonMin);
      t.lat = EXTENT.latMin + Math.random() * (EXTENT.latMax - EXTENT.latMin);
      t.age = 0;
      t.life = LIFE_MIN + Math.random() * LIFE_RANGE;
    };

    const count = coarse ? 450 : 1400;
    const tracers: Tracer[] = Array.from({ length: count }, () => {
      const t: Tracer = { lon: 0, lat: 0, age: 0, life: 0 };
      spawn(t);
      t.age = Math.random() * t.life;   // stagger the first generation
      return t;
    });

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
    };
    size();
    window.addEventListener("resize", size);

    let onScreen = true;
    let raf = 0;
    const io = new IntersectionObserver(
      (e) => {
        onScreen = e[0]?.isIntersecting ?? true;
        if (onScreen && raf === 0) raf = requestAnimationFrame(render);
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    function render() {
      raf = 0;
      if (!onScreen) return;   // the observer restarts it
      const f = fieldRef.current;

      // Fade the previous frame by erasing alpha rather than painting over it.
      // The canvas has to stay transparent: the map, its coastline and its
      // source polygons are the SVG underneath.
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillStyle = `rgba(0,0,0,${TRAIL_FADE})`;
      ctx!.fillRect(0, 0, W, H);
      ctx!.globalCompositeOperation = "source-over";

      if (f) {
        ctx!.lineWidth = 1.25;
        ctx!.lineCap = "round";
        for (const t of tracers) {
          const { u, v } = sampleField(f, t.lon, t.lat);
          const speed = Math.hypot(u, v);

          // A tracer in dead air would sit still and smear one dot forever.
          if (speed < 0.15 || t.age++ > t.life) { spawn(t); continue; }

          const a = project(t.lon, t.lat);
          // Longitude degrees shrink with latitude, so the eastward step is
          // divided by cos(lat). Without it the field skews poleward.
          const cos = Math.max(0.2, Math.cos((t.lat * Math.PI) / 180));
          t.lon += (u * SPEED_SCALE) / cos / 60;
          t.lat += (v * SPEED_SCALE) / 60;
          const b = project(t.lon, t.lat);

          if (b.x < 0 || b.y < 0 || b.x > W || b.y > H) { spawn(t); continue; }

          // Fade in and out over the life so respawns are never a visible pop.
          const edge = Math.min(1, t.age / 14, (t.life - t.age) / 22);
          ctx!.strokeStyle = speedColor(speed);
          ctx!.globalAlpha = (isLightMode ? 0.72 : 0.85) * edge;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", size);
    };
    // Only the theme rebuilds the loop. The field is read through a ref, so
    // changing month or refreshing the live reading swaps the vectors without
    // restarting the particles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLightMode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
