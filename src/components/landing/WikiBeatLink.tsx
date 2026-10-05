import { wikiHref, type WikiLink } from "@/src/lib/wikiLinks";

/**
 * The way from a scroll beat to the wiki section that writes it up. Underlined
 * at rest, so it reads as a link without the reader having to find it by hover.
 */
export function WikiBeatLink({
  link,
  shadow,
  className = "mt-5 inline-block",
}: {
  link: WikiLink;
  shadow?: string;
  className?: string;
}) {
  return (
    <a
      href={wikiHref(link)}
      target="_blank"
      rel="noreferrer"
      className={`wght-link text-[length:var(--text-micro)] text-foreground underline decoration-dune-orange decoration-1 underline-offset-[6px] ${className}`}
      style={shadow ? { textShadow: shadow } : undefined}
    >
      {link.label} on the wiki <span aria-hidden>{"↗"}</span>
    </a>
  );
}
