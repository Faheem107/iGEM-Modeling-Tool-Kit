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
const KEEP_CASE = /([µͰ-Ͽ\u2000-\u2bff]+[A-Za-z]*)/;

/**
 * A short trailing parenthetical or bracket: "(pFBA)", "(fresh)", "[Pa s]".
 * Left to itself it orphans onto a line of its own the moment the column
 * narrows, which is exactly what "Optimal Flux Distribution (pFBA)" did.
 * Captured with the space before it so the whole tail stays with its label.
 */
const TRAILING_TAIL = /(\s+[([][^)\]]{1,16}[)\]]\s*)$/;

export function CaptionText({ children }: { children: React.ReactNode }): React.ReactNode {
  if (typeof children === "number") return children;
  if (typeof children === "string") {
    // Bind a trailing parenthetical to the word before it. Guarded on
    // tail.index: a label that is ENTIRELY a parenthetical has nothing to bind
    // it to, and recursing on the whole string again would never terminate.
    const tail = children.match(TRAILING_TAIL);
    if (tail && tail.index !== undefined && tail.index > 0) {
      return (
        <>
          <CaptionText>{children.slice(0, tail.index)}</CaptionText>
          <span className="whitespace-nowrap">{keepCase(tail[1])}</span>
        </>
      );
    }
    return keepCase(children);
  }
  if (Array.isArray(children)) {
    return children.map((c, i) => (
      <React.Fragment key={i}>
        <CaptionText>{c}</CaptionText>
      </React.Fragment>
    ));
  }
  return element(children);
}

/** Wrap the runs that must escape the uppercase transform. Never recurses. */
function keepCase(text: string): React.ReactNode {
  if (!KEEP_CASE.test(text)) return text;
  return text.split(KEEP_CASE).map((part, i) =>
      KEEP_CASE.test(part) ? (
        <span key={i} className="caption-asis">
          {part}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
  );
}

function element(children: React.ReactNode): React.ReactNode {
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
