/**
 * Where each part of the landing story is written up on the team wiki.
 *
 * The Model pages live on the wiki's model-wiki branch, previewed at the
 * address below, until the team merges them into the live wiki. Set
 * NEXT_PUBLIC_WIKI_URL to the iGEM wiki address once that has happened.
 */
export const WIKI_URL = (
  process.env.NEXT_PUBLIC_WIKI_URL ?? "https://model-wiki.vercel.app/nyu-abu-dhabi"
).replace(/\/$/, "");

export interface WikiLink {
  /** Path on the wiki, with an optional #section. */
  path: string;
  label: string;
}

export const wikiHref = (link: WikiLink) => `${WIKI_URL}${link.path}`;
