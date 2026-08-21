"use client";

import React from "react";

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
        className={`p-6 rounded-[6px] border flex flex-col items-start gap-4 ${
          isLightMode
            ? "bg-dune-orange/70 border-dune-orange text-dune-orange"
            : "bg-dune-orange/20 border-dune-orange/40 text-dune-orange"
        }`}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-[length:var(--text-micro)] font-black uppercase tracking-wide">
            {label ? `${label} hit a snag` : "This module hit a snag"}
          </h3>
        </div>
        <p className="text-[length:var(--text-micro)] leading-relaxed opacity-80 max-w-md">
          A value from one of the controls pushed this simulation out of range.
          Nothing else on the page was affected, reset the module to continue.
        </p>
        <button
          onClick={this.reset}
          className={`flex items-center gap-2 px-4 py-2 rounded-[6px] text-[length:var(--text-micro)] font-bold transition ${
            isLightMode
              ? "bg-dune-orange/10 hover:bg-dune-orange/20 text-dune-orange"
              : "bg-dune-orange/40 hover:bg-dune-orange/60 text-dune-orange"
          }`}
        >
          Try again
        </button>
      </div>
    );
  }
}
