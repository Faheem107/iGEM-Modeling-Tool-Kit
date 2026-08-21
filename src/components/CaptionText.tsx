import React from "react";

/**
 * Keeps Greek letters and the micro sign readable inside a `.caption`.
 *
 * `.caption` sets `text-transform: uppercase`, and CSS uppercase maps every
 * symbol it meets: µ becomes M, γ becomes Γ, θ becomes Θ, and ρ, α and β become
 * Ρ, Α and Β, which are visually identical to Latin P, A and B. So a stat card
 * labelled "Max growth µ" rendered as "MAX GROWTH M", stating a different
 * quantity, and "γ-PGA" rendered as "Γ-PGA".
 *
 * `.caption-asis` (app/globals.css) opts one run of characters out of the
 * transform. This walks a ReactNode and wraps only the runs that need it, so
 * the register stays uppercase and the symbols stay true. Labels carrying JSX,
 * a glossary term for instance, pass through untouched apart from their text.
 *
 * Applied centrally in Panel and StatCard, which is where nearly every caption
 * on the site is rendered. Reach for it directly only for a caption built
 * outside those.
 */

/** Micro sign, Greek and Coptic, and the symbol/arrow blocks. */
const KEEP_CASE = /([µͰ-Ͽ -⯿]+[A-Za-z]*)/;

export function CaptionText({ children }: { children: React.ReactNode }): React.ReactNode {
  if (typeof children === "number") return children;
  if (typeof children === "string") {
    if (!KEEP_CASE.test(children)) return children;
    return children.split(KEEP_CASE).map((part, i) =>
      KEEP_CASE.test(part) ? (
        <span key={i} className="caption-asis">
          {part}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );
  }
  if (Array.isArray(children)) {
    return children.map((c, i) => (
      <React.Fragment key={i}>
        <CaptionText>{c}</CaptionText>
      </React.Fragment>
    ));
  }
  if (React.isValidElement(children)) {
    const el = children as React.ReactElement<{ children?: React.ReactNode }>;
    const inner = el.props?.children;
    if (inner === undefined || inner === null) return children;

    // Fragments and plain host elements (a span, an em) are ours to rebuild, so
    // a title assembled as <>text {variable} <Term/></> still gets walked.
    const isFragment = el.type === React.Fragment;
    const isHost = typeof el.type === "string";
    if (isFragment || isHost) {
      return React.cloneElement(el, undefined, <CaptionText>{inner}</CaptionText>);
    }

    // Anything else manages its own children. A glossary term wraps its text in
    // a drop target and a component may animate per character, so cloning it
    // would fight it. Descend only when the child is plain text.
    if (typeof inner === "string" && KEEP_CASE.test(inner)) {
      return React.cloneElement(el, undefined, <CaptionText>{inner}</CaptionText>);
    }
    return children;
  }
  return children;
}

export default CaptionText;
