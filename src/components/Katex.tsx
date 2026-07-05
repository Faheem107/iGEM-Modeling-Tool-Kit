'use client';

import React from 'react';
import katex from 'katex';

/**
 * Katex
 * =====
 * Tiny offline LaTeX renderer used by the "Show the Math" windows. It calls
 * `katex.renderToString` once per formula and injects the result — no network, so it is
 * safe under a strict CSP and in SSR. `display` centres block-level equations.
 */
export default function Katex({
  tex,
  display = true,
  className,
}: {
  tex: string;
  display?: boolean;
  className?: string;
}) {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        output: 'html',
      });
    } catch {
      return tex;
    }
  }, [tex, display]);

  return (
    <span
      className={className}
      // KaTeX output is a trusted, locally-generated string (no user input).
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
