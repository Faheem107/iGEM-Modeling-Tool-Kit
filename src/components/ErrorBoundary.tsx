"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * ModuleErrorBoundary
 * ===================
 * Wraps each simulation module so a runtime error (e.g. a slider driving a value into an
 * unexpected state) degrades to a friendly, recoverable card instead of white-screening the
 * whole app. "Try again" resets the boundary and re-mounts the module's children.
 */
interface Props {
  children: React.ReactNode;
  isLightMode?: boolean;
  /** Human label for the failing module, used in the fallback copy. */
  label?: string;
}
interface State {
  hasError: boolean;
}

export default class ModuleErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Keep a console trace for debugging; never rethrow (that would crash the app).
    // eslint-disable-next-line no-console
    console.error("[Sandyx] module render error:", error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    const { isLightMode, label } = this.props;
    return (
      <div
        className={`p-6 rounded-2xl border flex flex-col items-start gap-3 ${
          isLightMode
            ? "bg-amber-50/70 border-amber-200 text-amber-900"
            : "bg-amber-950/20 border-amber-900/40 text-amber-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-sm font-black uppercase tracking-wide">
            {label ? `${label} hit a snag` : "This module hit a snag"}
          </h3>
        </div>
        <p className="text-xs leading-relaxed opacity-80 max-w-md">
          A value from one of the controls pushed this simulation out of range.
          Nothing else on the page was affected — reset the module to continue.
        </p>
        <button
          onClick={this.reset}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            isLightMode
              ? "bg-amber-100 hover:bg-amber-200 text-amber-900"
              : "bg-amber-900/40 hover:bg-amber-900/60 text-amber-100"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Try again
        </button>
      </div>
    );
  }
}
