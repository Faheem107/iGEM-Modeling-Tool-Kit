"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw, RefreshCw, Loader2 } from "lucide-react";

/**
 * Headless Mol* 3D structure viewer. We drive Mol*'s PluginContext directly (no
 * mol-plugin-ui), so there's no Mol* control chrome and no external stylesheet to
 * import, the canvas blends into the Dunelock card and we render our own controls.
 * All Mol* imports are dynamic + inside effects so nothing touches the server.
 */
/** Imperative handle the landing page uses to drive rotation from scroll. */
export interface MolstarApi {
  /** Set the auto-rotation speed. 0 stops the spin. */
  setSpinSpeed: (speed: number) => void;
}

// A very slow baseline spin so structures read as alive without being distracting
// (DESIGN.md: quiet, alive). Mol*'s default trackball spin speed is 1.0, so this is
// deliberately far under that, close to the calm rotation on premium biotech sites.
const BASE_SPIN_SPEED = 0.12;

export default function MolstarViewer({
  url,
  className = "",
  spinByDefault = true,
  showControls = true,
  emphasis = false,
  color,
  baseSpeed = BASE_SPIN_SPEED,
  onReady,
}: {
  url: string;
  className?: string;
  /** Start rotating on load (default). Set false for a still first frame. */
  spinByDefault?: boolean;
  /** Show the spin / reset buttons (hidden when rotation is driven externally). */
  showControls?: boolean;
  /** Premium hero look: soft ambient occlusion + a faint edge so the structure
   *  reads with depth on an elegant stage (used on the landing page). */
  emphasis?: boolean;
  /** Recolour the whole structure to a single brand hex (e.g. 0x8fb3ac). When
   *  omitted, Mol*'s default chain colouring is kept. */
  color?: number;
  /** Baseline auto-rotation speed (defaults to the calm 0.12). */
  baseSpeed?: number;
  /** Receives an imperative handle once the viewer is live. */
  onReady?: (api: MolstarApi) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pluginRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(spinByDefault);
  const [error, setError] = useState<string | null>(null);
  // Current spin speed, kept in a ref so reloads re-apply it without a re-render.
  const spinSpeedRef = useRef(spinByDefault ? baseSpeed : 0);
  // Brand colour kept in a ref so structure reloads re-apply it without a re-render.
  const colorRef = useRef(color);
  colorRef.current = color;

  // Apply an auto-rotation speed to the trackball; speed 0 turns it off. The spin params MUST carry
  // an `axis` (the animation loop reads axis[0..2]); omitting it crashes Mol*'s trackball each frame.
  const applySpin = (speed: number) => {
    const plugin = pluginRef.current;
    if (!plugin?.canvas3d) return;
    plugin.canvas3d.setProps({
      trackball: {
        animate:
          speed > 0
            ? { name: "spin", params: { speed, axis: [0, 1, 0] } }
            : { name: "off", params: {} },
      },
    });
  };

  // Initialise the plugin + WebGL canvas once.
  useEffect(() => {
    let disposed = false;
    let canvas: HTMLCanvasElement | null = null;
    (async () => {
      try {
        const [{ PluginContext }, { DefaultPluginSpec }] = await Promise.all([
          import("molstar/lib/mol-plugin/context"),
          import("molstar/lib/mol-plugin/spec"),
        ]);
        if (disposed || !containerRef.current) return;

        const plugin = new PluginContext(DefaultPluginSpec());
        await plugin.init();
        if (disposed) {
          plugin.dispose();
          return;
        }

        canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        containerRef.current.appendChild(canvas);

        const ok = await plugin.initViewerAsync(canvas, containerRef.current);
        if (disposed) {
          plugin.dispose();
          return;
        }
        if (!ok) {
          setError("WebGL is unavailable in this browser.");
          return;
        }
        // Transparent so the warm card shows through behind the structure, and hide the
        // little orientation-axes gizmo (unneeded chrome on our clean cards / hero).
        plugin.canvas3d?.setProps({
          transparentBackground: true,
          camera: { helper: { axes: { name: "off", params: {} } } },
        });
        // Premium hero: soft ambient occlusion for depth (the reference biotech
        // sites lean on depth, not hard lines) plus a faint edge so the structure
        // stays crisp against the glow. Guarded, if this Mol* build shapes the
        // params differently we skip it and the structure still renders normally.
        if (emphasis) {
          try {
            plugin.canvas3d?.setProps({
              postprocessing: {
                occlusion: {
                  name: "on",
                  params: {
                    samples: 32,
                    multiScale: { name: "off", params: {} },
                    radius: 5,
                    bias: 0.8,
                    blurKernelSize: 15,
                    blurDepthBias: 0.5,
                    resolutionScale: 1,
                    color: 0x000000,
                    transparentThreshold: 0.4,
                  },
                },
                outline: {
                  name: "on",
                  params: {
                    scale: 1,
                    threshold: 0.33,
                    color: 0x1a120d,
                    includeTransparent: true,
                  },
                },
                shadow: { name: "off", params: {} },
              },
            });
          } catch {
            /* postprocessing unsupported in this build, ignore */
          }
        }

        pluginRef.current = plugin;
        setReady(true);
        onReady?.({
          setSpinSpeed: (speed: number) => {
            spinSpeedRef.current = speed;
            applySpin(speed);
            setSpinning(speed > 0);
          },
        });
      } catch {
        setError("Could not start the 3D viewer.");
      }
    })();

    return () => {
      disposed = true;
      try {
        pluginRef.current?.dispose();
      } catch {
        /* ignore */
      }
      pluginRef.current = null;
      if (canvas?.parentElement) canvas.parentElement.removeChild(canvas);
    };
  }, []);

  // (Re)load the structure whenever the plugin is ready or the URL changes.
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin || !ready) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { Asset } = await import("molstar/lib/mol-util/assets");
        await plugin.clear();
        const data = await plugin.builders.data.download(
          { url: Asset.Url(url) },
          { state: { isGhost: true } },
        );
        if (cancelled) return;
        const trajectory = await plugin.builders.structure.parseTrajectory(
          data,
          "pdb",
        );
        await plugin.builders.structure.hierarchy.applyPreset(
          trajectory,
          "default",
        );
        if (cancelled) return;
        // Recolour the whole structure to the brand hex, so the protein reads in
        // the Dunelock palette instead of Mol*'s default chain colour.
        if (colorRef.current != null) {
          try {
            const { Color } = await import(
              "molstar/lib/mol-util/color/color"
            );
            const structures =
              plugin.managers.structure.hierarchy.current.structures;
            for (const s of structures) {
              await plugin.managers.structure.component.updateRepresentationsTheme(
                s.components,
                {
                  color: "uniform",
                  colorParams: { value: Color(colorRef.current) },
                },
              );
            }
          } catch {
            /* recolour unsupported in this build, keep default colours */
          }
        }
        if (!cancelled) {
          setLoading(false);
          // plugin.clear() reset the trackball, so re-apply the current spin.
          applySpin(spinSpeedRef.current);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load this structure.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, ready]);

  const toggleSpin = () => {
    if (!pluginRef.current?.canvas3d) return;
    const nextSpeed = spinning ? 0 : baseSpeed;
    spinSpeedRef.current = nextSpeed;
    applySpin(nextSpeed);
    setSpinning(nextSpeed > 0);
  };

  const resetCamera = () => {
    pluginRef.current?.canvas3d?.requestCameraReset();
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />

      {(loading || error) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {error ? (
            <span className="text-sm font-semibold text-dune-maroon dark:text-dune-rose px-4 text-center">
              {error}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm text-dune-ash">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading structure…
            </span>
          )}
        </div>
      )}

      {ready && !error && showControls && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            onClick={toggleSpin}
            aria-label="Toggle auto-rotation"
            className={`p-2 rounded-[3px] border border-border transition-colors ${
              spinning
                ? "bg-dune-orange text-[#241c19]"
                : "bg-card hover:brightness-95"
            }`}
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={resetCamera}
            aria-label="Reset camera"
            className="p-2 rounded-[3px] border border-border bg-card hover:brightness-95 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
