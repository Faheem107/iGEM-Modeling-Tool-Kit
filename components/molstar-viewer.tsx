"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw, RefreshCw, Loader2 } from "lucide-react";

/**
 * Headless Mol* 3D structure viewer. We drive Mol*'s PluginContext directly (no
 * mol-plugin-ui), so there's no Mol* control chrome and no external stylesheet to
 * import, the canvas blends into the Dunelock card and we render our own controls.
 * All Mol* imports are dynamic + inside effects so nothing touches the server.
 */
export default function MolstarViewer({
  url,
  className = "",
}: {
  url: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pluginRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Transparent so the warm card shows through behind the structure.
        plugin.canvas3d?.setProps({ transparentBackground: true });

        pluginRef.current = plugin;
        setReady(true);
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
        if (!cancelled) setLoading(false);
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
    const plugin = pluginRef.current;
    if (!plugin?.canvas3d) return;
    const next = !spinning;
    plugin.canvas3d.setProps({
      trackball: {
        animate: next
          ? { name: "spin", params: { speed: 1 } }
          : { name: "off", params: {} },
      },
    });
    setSpinning(next);
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

      {ready && !error && (
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
