"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mountEdc, type Edc } from "@/src/lib/edcDiagram";
import { wikiHref } from "@/src/lib/wikiLinks";
import {
  MODEL_CYCLE,
  MODEL_CYCLE_STAGES,
  MODEL_CYCLE_STATUS,
  MODEL_CYCLE_STATUS_NOTE,
} from "@/src/lib/modelCycle";

const TITLES = MODEL_CYCLE.map((iteration) => iteration.short);

/**
 * The models' own engineering cycle, drawn with the same diagram and the same
 * layout the wiki's Model page uses, so the two read as one team's work. The
 * diagram engine owns the SVG; this component owns the iteration row and the
 * text beside it.
 */
export default function ModelCycle() {
  const hostRef = useRef<HTMLDivElement>(null);
  const edcRef = useRef<Edc | null>(null);
  const [active, setActive] = useState(0);

  const activeRef = useRef(0);

  // Used by the dots and by the diagram's inner loops, which jump back to an
  // earlier iteration. It reads the current index from a ref so the diagram can
  // hold on to one copy of it.
  const show = useCallback((index: number) => {
    if (index === activeRef.current) return;
    const next = MODEL_CYCLE[index];
    activeRef.current = index;
    edcRef.current?.setCycle(index, MODEL_CYCLE.length, next.short, next.cycle, {
      titles: TITLES,
    });
    setActive(index);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const edc = mountEdc(host, {
      onCycle: show,
      shape: "infinity",
      stages: [...MODEL_CYCLE_STAGES],
      title: "Engineering cycle",
    });
    const first = MODEL_CYCLE[activeRef.current];
    edc.setCycle(activeRef.current, MODEL_CYCLE.length, first.short, first.cycle, {
      instant: true,
      titles: TITLES,
    });
    edcRef.current = edc;

    return () => {
      edc.destroy();
      edcRef.current = null;
      host.innerHTML = "";
    };
  }, [show]);

  const iteration = MODEL_CYCLE[active];
  const fill = (active / (MODEL_CYCLE.length - 1)) * 100;

  return (
    <section
      aria-labelledby="model-cycle-heading"
      className="model-cycle"
      id="model-cycle"
    >
      <header className="model-cycle-head">
        <div>
          <p className="model-cycle-eyebrow">Design, Build, Test, Learn</p>
          <h2 id="model-cycle-heading">How the models changed</h2>
        </div>
        <p className="model-cycle-status">
          <strong>{MODEL_CYCLE_STATUS}</strong>
          <span>{MODEL_CYCLE_STATUS_NOTE}</span>
        </p>
      </header>

      <div className="model-cycle-body">
        <div className="model-cycle-info">
          <p className="model-cycle-count">
            Iteration {active + 1} of {MODEL_CYCLE.length}
          </p>
          <h3 key={iteration.title}>{iteration.title}</h3>
          <p className="model-cycle-summary" key={iteration.summary}>
            {iteration.summary}
          </p>
          <a
            className="model-cycle-link"
            href={wikiHref(iteration.wiki)}
            rel="noreferrer"
            target="_blank"
          >
            {iteration.wiki.label}
          </a>

          <div className="model-cycle-nav">
            <div className="model-cycle-track">
              <div className="model-cycle-fill" style={{ width: `${fill}%` }} />
            </div>
            <div className="model-cycle-dots">
              {MODEL_CYCLE.map((item, index) => (
                <button
                  aria-current={index === active ? "step" : undefined}
                  aria-label={`Iteration ${index + 1}: ${item.title}`}
                  className={`model-cycle-dot${index === active ? " on" : ""}${
                    index < active ? " passed" : ""
                  }`}
                  key={item.title}
                  onClick={() => show(index)}
                  type="button"
                >
                  <span>{item.short}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="model-cycle-diagram" ref={hostRef} />
      </div>
    </section>
  );
}
