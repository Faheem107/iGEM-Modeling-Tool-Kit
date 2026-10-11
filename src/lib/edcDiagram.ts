/**
 * The engineering design cycle diagram.
 * ==========================================================================
 * A port of the drawing the wiki's Hardware page uses, so the toolkit and the
 * wiki tell the same story in the same picture. It is deliberately imperative
 * and framework free: it builds its own SVG, owns its own animation loop, and
 * hands back `destroy()` so a React unmount stops every timer and observer.
 *
 *   mountEdc(el, { shape, stages, title, onCycle }) -> { setCycle, setStage, stop, destroy }
 *
 * The loop is drawn once as a path. A traveller dot walks it, the four stage
 * nodes sit at fixed fractions along it, and each past iteration is drawn as a
 * smaller loop inside the track, so a reader can see how many turns the work
 * has taken without reading a word. Clicking an inner loop jumps back to that
 * iteration.
 */

type Stage = { key: string; name: string };

type EdcOptions = {
  autoplay?: boolean;
  foot?: string;
  onCycle?: (i: number) => void;
  onStage?: (i: number) => void;
  shape?: string;
  stages: Stage[];
  title?: string;
};

type AnimateOptions = { ease?: string; force?: boolean };
type CycleOptions = { instant?: boolean; noAutoplay?: boolean; titles?: string[] };

type ShapeDef = {
  label: (x: number, y: number) => number[];
  lapScale: (i: number) => number;
  offset: number;
  pos: (f: number, k?: number) => number[];
  viewBox: string;
};

export type Edc = {
  destroy: () => void;
  setCycle: (
    i: number,
    tot: number,
    title: string,
    texts: Record<string, string>,
    o?: CycleOptions,
  ) => number;
  setStage: (i: number, dur?: number) => void;
  stop: () => void;
};

const NS = "http://www.w3.org/2000/svg";
const TAU = Math.PI * 2;
const MAX_LAPS = 8;

const ENTITIES: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

const esc = (value: unknown) =>
  String(value == null ? "" : value).replace(/[&<>"]/g, (c) => ENTITIES[c]);

const pad2 = (n: number) => String(n).padStart(2, "0");

const el = (
  tag: string,
  attrs: Record<string, string | number>,
  parent?: Element | null,
) => {
  const node = document.createElementNS(NS, tag) as SVGElement;
  for (const k in attrs) node.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(node);
  return node;
};

/* ---------- the two shapes ----------
   pos(f, k): point at fraction f (0..1) along the loop, scaled by k
   offset   : where stage 1 sits (stage i is at f = (i + offset) / N)
   lapScale : size of the inner loop for the i-th previous iteration
              (i = 0 is the most recent one, drawn closest to the track) */
const SHAPES: Record<string, ShapeDef> = {
  circle: {
    viewBox: "-40 -26 380 352",
    offset: 0,
    pos(f, k) {
      const R = 112 * (k || 1);
      const a = TAU * f - Math.PI / 2;
      return [150 + R * Math.cos(a), 150 + R * Math.sin(a)];
    },
    lapScale(i) {
      return (90 - i * 8) / 112;
    },
    label(x, y) {
      const dx = x - 150;
      const dy = y - 150;
      const d = Math.hypot(dx, dy) || 1;
      return [150 + (dx / d) * 148, 150 + (dy / d) * 146 + 3];
    },
  },
  infinity: {
    viewBox: "0 -6 440 262",
    offset: 0.5, // the crossing point is f = 0
    pos(f, k) {
      const a = 188 * (k || 1);
      const t = Math.PI / 2 + TAU * f;
      const s = Math.sin(t);
      const c = Math.cos(t);
      const den = 1 + s * s;
      return [220 + (a * c) / den, 118 + (a * s * c) / den];
    },
    lapScale(i) {
      return 0.87 - i * 0.075;
    },
    label(x, y) {
      return [x, y < 118 ? y - 30 : y + 34];
    },
  },
};

function pathD(shape: ShapeDef, k?: number) {
  let d = "";
  for (let i = 0; i <= 240; i++) {
    const p = shape.pos(i / 240, k);
    d += (i ? "L" : "M") + p[0].toFixed(2) + " " + p[1].toFixed(2);
  }
  return d + "Z";
}

export function mountEdc(host: HTMLElement, opts: EdcOptions): Edc {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const stages = opts.stages;
  const N = stages.length;
  const kind = opts.shape === "infinity" ? "infinity" : "circle";
  const shape = SHAPES[kind];
  const stageF = (i: number) => (i + shape.offset) / N;

  host.innerHTML =
    '<div class="edc edc-' +
    kind +
    '">' +
    '<div class="edc-graphic"></div>' +
    '<div class="edc-text"><div class="edc-head"><span class="kicker">' +
    esc(opts.title || "Engineering design cycle") +
    '</span><b class="edc-cycle-title"></b></div><div class="edc-cards"></div>' +
    (opts.foot ? '<div class="edc-foot">' + esc(opts.foot) + "</div>" : "") +
    "</div></div>";
  const g = host.querySelector(".edc-graphic");
  const titleEl = host.querySelector(".edc-cycle-title");
  const cardsEl = host.querySelector(".edc-cards");

  const svg = el(
    "svg",
    {
      viewBox: shape.viewBox,
      role: "img",
      "aria-label": "Engineering design cycle diagram",
    },
    g,
  );
  const laps = el("g", {}, svg);
  const track = el("path", { class: "edc-track", d: pathD(shape) }, svg) as SVGPathElement;
  const prog = el("path", { class: "edc-progress", d: pathD(shape) }, svg);
  const LEN = track.getTotalLength();
  prog.style.strokeDasharray = "0 " + LEN;

  // direction chevrons between stages
  for (let i = 0; i < N; i++) {
    const f = stageF(i) + 0.5 / N;
    const a = shape.pos(f - 0.004);
    const b = shape.pos(f + 0.004);
    const p = shape.pos(f);
    const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    el(
      "path",
      {
        class: "edc-chevron",
        d: "M-4 -5 L3 0 L-4 5",
        transform: "translate(" + p[0] + " " + p[1] + ") rotate(" + ang + ")",
      },
      svg,
    );
  }

  // cycle counter: in the middle of the circle, under the infinity
  let showCount: (i: number, tot: number) => void;
  if (kind === "circle") {
    const k = el("text", { class: "edc-center-kicker", x: 150, y: 124 }, svg);
    k.textContent = "Cycle";
    const num = el("text", { class: "edc-center-num", x: 150, y: 168 }, svg);
    const of = el("text", { class: "edc-center-of", x: 150, y: 190 }, svg);
    showCount = (i, tot) => {
      num.textContent = pad2(i + 1);
      of.textContent = "of " + pad2(tot);
    };
  } else {
    const t = el("text", { class: "edc-center-of", x: 220, y: 250 }, svg);
    showCount = (i, tot) => {
      t.textContent = "Cycle " + pad2(i + 1) + " of " + pad2(tot);
    };
  }

  // traveller
  const halo = el("circle", { class: "edc-traveller-halo", r: 11 }, svg);
  const dot = el("circle", { class: "edc-traveller", r: 5 }, svg);

  // stage nodes
  const nodes = stages.map((s, i) => {
    const p = shape.pos(stageF(i));
    const n = el(
      "g",
      { class: "edc-node", tabindex: 0, role: "button", "aria-label": s.name },
      svg,
    );
    el("circle", { cx: p[0], cy: p[1], r: 17 }, n);
    const num = el("text", { class: "edc-num", x: p[0], y: p[1] + 1 }, n);
    num.textContent = pad2(i + 1);
    const lp = shape.label(p[0], p[1]);
    const lab = el("text", { class: "edc-label", x: lp[0], y: lp[1] }, n);
    lab.textContent = s.name;
    const go = () => {
      userTook();
      setStage(i);
    };
    n.addEventListener("click", go);
    n.addEventListener("keydown", (e) => {
      const key = (e as KeyboardEvent).key;
      if (key === "Enter" || key === " ") {
        e.preventDefault();
        go();
      }
    });
    return n;
  });

  // cards
  const cards = stages.map((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "edc-card";
    b.innerHTML = "<small><i>" + pad2(i + 1) + "</i>" + esc(s.name) + "</small><p></p>";
    b.addEventListener("click", () => {
      userTook();
      setStage(i);
    });
    cardsEl?.appendChild(b);
    return b;
  });

  /* ---------- state + animation ---------- */
  let fCur = stageF(0);
  let stage = 0;
  let raf = 0;
  let cycle = 0;
  let titles: string[] = [];

  function place(f: number) {
    const fr = ((f % 1) + 1) % 1;
    const p = shape.pos(fr);
    dot.setAttribute("cx", String(p[0]));
    dot.setAttribute("cy", String(p[1]));
    halo.setAttribute("cx", String(p[0]));
    halo.setAttribute("cy", String(p[1]));
    prog.style.strokeDasharray = fr * LEN + " " + LEN;
  }

  const wrap1 = (f: number) => ((f % 1) + 1) % 1;

  // o.force: animate even when the visitor prefers reduced motion (used for the
  // short, click-triggered wind / unwind so the loops are always seen peeling off)
  // o.ease: "inout" (default) or "brisk" (quick start, steady middle, soft stop)
  function animateTo(
    fTarget: number,
    dur: number,
    done?: () => void,
    onFrame?: (f: number) => void,
    o?: AnimateOptions,
  ) {
    cancelAnimationFrame(raf);
    const force = o && o.force;
    if ((reduce && !force) || dur <= 0) {
      fCur = wrap1(fTarget);
      place(fCur);
      if (onFrame) onFrame(fTarget);
      if (done) done();
      return;
    }
    const from = fCur;
    const dist = fTarget - from;
    const t0 = performance.now();
    const ease =
      o && o.ease === "brisk"
        ? (p: number) =>
            p < 0.12
              ? (p / 0.12) * (p / 0.12) * 0.06
              : p > 0.88
                ? 1 - Math.pow((1 - p) / 0.12, 2) * 0.06
                : 0.06 + ((p - 0.12) / 0.76) * 0.88
        : (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const step = (ts: number) => {
      const p = Math.min(1, (ts - t0) / dur);
      fCur = from + dist * ease(p);
      place(fCur);
      if (onFrame) onFrame(fCur);
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        fCur = wrap1(fTarget);
        if (done) done();
      }
    };
    step(t0);
  }

  function paintStage() {
    nodes.forEach((n, i) => {
      n.classList.toggle("on", i === stage);
      n.classList.toggle("done", i < stage);
    });
    cards.forEach((c, i) => c.classList.toggle("on", i === stage));
  }

  function setStage(i: number, dur?: number) {
    stage = Math.max(0, Math.min(N - 1, i));
    paintStage();
    const target = stageF(stage);
    animateTo(target, dur == null ? 260 + Math.abs(target - fCur) * 1400 : dur);
    if (opts.onStage) opts.onStage(stage);
  }

  /* inner loops = previous iterations; click one to jump back to it */
  let lapsShown = -1;
  function drawLaps(count?: number) {
    if (count == null) count = cycle;
    if (count === lapsShown) return;
    lapsShown = count;
    laps.innerHTML = "";
    const n = Math.min(count, MAX_LAPS);
    for (let i = n - 1; i >= 0; i--) {
      const iter = count - 1 - i; // i = 0 is the most recent previous iteration
      const d = pathD(shape, shape.lapScale(i));
      const lap = el(
        "g",
        {
          class: "edc-lap-group",
          tabindex: 0,
          role: "button",
          "aria-label":
            "Go to iteration " + (iter + 1) + (titles[iter] ? ": " + titles[iter] : ""),
        },
        laps,
      );
      const tip = el("title", {}, lap);
      tip.textContent =
        "Iteration " + (iter + 1) + (titles[iter] ? " · " + titles[iter] : "");
      el(
        "path",
        {
          class: "edc-lap",
          d,
          style: "opacity:" + Math.max(0.12, 0.34 - i * 0.03).toFixed(2),
        },
        lap,
      );
      el("path", { class: "edc-lap-hit", d }, lap);
      const go = () => {
        if (opts.onCycle) opts.onCycle(iter);
      };
      lap.addEventListener("click", go);
      lap.addEventListener("keydown", (e) => {
        const key = (e as KeyboardEvent).key;
        if (key === "Enter" || key === " ") {
          e.preventDefault();
          go();
        }
      });
    }
    laps.classList.toggle("clickable", !!opts.onCycle);
  }

  /* autoplay: after a new cycle is chosen, walk through the stages once */
  let playTimer = 0;
  let userStopped = false;
  let visible = true;

  function userTook() {
    userStopped = true;
    clearTimeout(playTimer);
  }

  function autoplay() {
    clearTimeout(playTimer);
    if (reduce || userStopped || opts.autoplay === false) return;
    const tick = () => {
      if (userStopped) return;
      if (!visible) {
        playTimer = window.setTimeout(tick, 600);
        return;
      }
      if (stage < N - 1) {
        setStage(stage + 1, 900);
        playTimer = window.setTimeout(tick, 2600);
      }
    };
    playTimer = window.setTimeout(tick, 2600);
  }

  let observer: IntersectionObserver | null = null;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (es) => {
        visible = es.some((e) => e.isIntersecting);
      },
      { threshold: 0.35 },
    );
    observer.observe(host);
  }

  const LAP_MS = 380; // time per loop when winding / unwinding several cycles

  function setCycle(
    i: number,
    tot: number,
    title: string,
    texts: Record<string, string>,
    o?: CycleOptions,
  ) {
    const prev = cycle;
    const instant = !!(o && o.instant);
    clearTimeout(playTimer); // a pending autoplay step must not interrupt this animation
    cycle = i;
    if (o && o.titles) {
      titles = o.titles;
      lapsShown = -1;
    }
    const writeText = () => {
      if (titleEl) {
        titleEl.textContent = "Cycle " + pad2(i + 1) + (title ? " · " + title : "");
      }
      cards.forEach((c, k) => {
        const t = (texts && texts[stages[k].key]) || "To add.";
        const p = c.querySelector("p");
        if (!p) return;
        p.textContent = t;
        p.classList.toggle("todo", /^to add/i.test(t));
      });
    };
    userStopped = !!(o && o.noAutoplay);
    stage = 0;
    paintStage();
    const s0 = stageF(0);
    const lapOf = (f: number) => Math.floor(f - s0 + 1e-6); // which lap f is in (laps start at stage 1)
    let ms = 0; // how long the wind / unwind takes (returned so other animations can match it)
    if (instant || i === prev) {
      writeText();
      drawLaps(i);
      showCount(i, tot);
      animateTo(s0, instant ? 0 : 450, autoplay);
    } else {
      // any jump forward or back: run quickly around the loop once per cycle,
      // adding (forward) or peeling off (back) one inner loop at every lap
      const steps = i - prev; // + forward, - back
      const startLap = lapOf(fCur);
      const target =
        (steps > 0 ? startLap + 1 : startLap) + s0 + (steps > 0 ? steps - 1 : steps);
      const dur = Math.min(3400, 300 + Math.abs(target - fCur) * LAP_MS);
      ms = dur;
      drawLaps(prev);
      showCount(prev, tot);
      animateTo(
        target,
        dur,
        () => {
          writeText();
          drawLaps(i);
          showCount(i, tot);
          autoplay();
        },
        (f) => {
          const lapStart = startLap + s0;
          let c =
            steps > 0
              ? prev + Math.floor(f - lapStart + 1e-6) // a loop is added as each lap completes
              : prev - Math.floor(lapStart - f + 1e-6); // a loop peels off as each lap is unwound
          c = Math.max(Math.min(prev, i), Math.min(Math.max(prev, i), c));
          drawLaps(c);
          showCount(c, tot);
        },
        { force: true, ease: "brisk" },
      );
    }
    if (opts.onStage) opts.onStage(0);
    return ms;
  }

  place(fCur);
  paintStage();

  return {
    destroy: () => {
      cancelAnimationFrame(raf);
      clearTimeout(playTimer);
      observer?.disconnect();
    },
    setCycle,
    setStage,
    stop: userTook,
  };
}
