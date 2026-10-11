"use client";

import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import { readScroll } from "@/src/components/SmoothScroll";

/**
 * A floor under one element.
 * ==========================================================================
 * The reader scrolls up freely and down only until the element's bottom edge
 * meets the bottom of the viewport. Past that the page does not move, so a
 * figure that takes a few seconds to tell its change cannot be scrolled
 * through before it has said anything. This is the companion to
 * `scrollLock.ts`: that one holds the page still while something sits on top
 * of it, this one puts a limit on how far down the page can go.
 *
 * Lenis is the complication. It owns the wheel globally and drives the real
 * scroll position from its own raf, so a native `scrollTo` correction would be
 * overwritten on the next frame. Where Lenis is running, the floor is enforced
 * on its scroll event with `scrollTo(floor, { immediate, force })`, which sets
 * the animated position and the target together and so also cancels the
 * momentum that was carrying the reader past. Under reduced motion Lenis never
 * starts, and there the native path runs instead. Either way nothing about the
 * document is changed, so releasing the floor is only dropping listeners.
 *
 * Two rules keep it from trapping anyone. It arms only if the reader is above
 * the floor at the moment it goes up, so arriving from below, or from a
 * curtain jump into a later section, is never pulled backwards. And a failsafe
 * releases it even if the caller never reports that it finished.
 */

/** Keys that move the page down. */
const DOWN_KEYS = new Set(["ArrowDown", "PageDown", "End", " ", "Spacebar"]);

/** A key press inside one of these belongs to the control, not to the page. */
const CONTROLS = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"]);

export function useScrollFloor({
  ref,
  active,
  failsafeMs = 12000,
}: {
  /** The element the reader is held above. */
  ref: RefObject<HTMLElement | null>;
  /** While this is true the floor is in force. */
  active: boolean;
  /** Let the reader through after this long whatever else happens. */
  failsafeMs?: number;
}) {
  const [held, setHeld] = useState(false);
  const [released, setReleased] = useState(false);

  const release = useCallback(() => setReleased(true), []);

  useEffect(() => {
    if (!active || released) return;

    const floorNow = () => {
      const el = ref.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      // Lenis keeps the eased position, which is what the rects were measured
      // against; window.scrollY can be a frame ahead of it.
      return Math.max(0, readScroll() + rect.bottom - window.innerHeight);
    };

    // Above the floor is the only place it makes sense to put one.
    const start = floorNow();
    if (start === null || readScroll() > start + 2) return;

    const lenis = window.__lenis;
    let armed = true;
    let fixing = false;

    const atFloor = () => {
      const floor = floorNow();
      return floor !== null && readScroll() >= floor - 1;
    };

    const clamp = () => {
      const floor = floorNow();
      if (!armed || fixing || floor === null) return;
      if (readScroll() > floor) {
        fixing = true;
        if (lenis) {
          lenis.scrollTo(floor, { immediate: true, force: true });
        } else {
          // The page scrolls smoothly, and a smooth correction would fight the
          // scroll it is correcting.
          window.scrollTo({ behavior: "instant", left: 0, top: floor });
        }
        fixing = false;
      }
      setHeld(readScroll() >= floor - 1);
    };

    // Without Lenis the wheel and the finger are stopped before the page moves
    // at all, so the floor reads as a wall rather than as a page that keeps
    // springing back. With Lenis the clamp above already cancels the momentum,
    // and intercepting the wheel would mean racing its own global handler.
    const onWheel = (event: WheelEvent) => {
      if (armed && event.deltaY > 0 && atFloor()) event.preventDefault();
    };

    let touchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? 0;
      if (armed && y < touchY && atFloor()) event.preventDefault();
    };

    // A link or a button outside the figure is the reader saying they want to
    // be somewhere else, and a curtain jump to another section would otherwise
    // be pulled straight back. The floor is there to stop them scrolling past
    // by accident, not to argue with a decision, so it comes down.
    const onPointerDown = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const control = target?.closest("a, button");
      if (control && !ref.current?.contains(control)) setReleased(true);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (CONTROLS.has(target.tagName) || target.isContentEditable)) {
        return;
      }
      if (event.key === " " && event.shiftKey) return;
      if (armed && DOWN_KEYS.has(event.key) && atFloor()) {
        event.preventDefault();
      }
    };

    if (lenis) {
      lenis.on("scroll", clamp);
    } else {
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
    }
    // The backstop for everything neither path sees: a dragged scrollbar, an
    // anchor jump, a focus scroll.
    window.addEventListener("scroll", clamp, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    const failsafe = window.setTimeout(() => setReleased(true), failsafeMs);

    return () => {
      armed = false;
      window.clearTimeout(failsafe);
      lenis?.off("scroll", clamp);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", clamp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [active, failsafeMs, ref, released]);

  // `held` is left standing after a release so the effect never has to reset
  // it. Whether the floor is in force is answered here instead.
  return { held: held && active && !released, release };
}

export default useScrollFloor;
