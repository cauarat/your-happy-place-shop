import { cubicBezier } from "framer-motion";

// The site's motion language, in one place. Every screen change — a step
// swapping out, a page being scrolled on someone's behalf — runs on the same
// curve and the same handful of durations, so pressing any button feels like
// the same gesture rather than a different animation each time.

/**
 * Decisive deceleration, no overshoot. The curve for things that *arrive*:
 * screens, panels, controls settling into place.
 */
export const EASE_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Ease-in-out, for things that *travel*: a guided scroll across a screen or
 * more. An out-curve like the one above spends its whole tail creeping the
 * last few pixels when the distance is that large, which reads as drifting
 * rather than arriving.
 */
export const EASE_TRAVEL: [number, number, number, number] = [0.65, 0, 0.35, 1];

/** Framer durations, in seconds. */
export const DURATION = {
  /** A control settling in place: a pill sliding, a label swapping. */
  control: 0.36,
  /** Content arriving within a screen that's already there. */
  content: 0.6,
  /** A whole screen giving way to another. */
  screen: 0.72,
} as const;

/**
 * The pace of a guided scroll, in pixels per second. Deliberately unhurried:
 * this is the site carrying someone somewhere, not teleporting them.
 *
 * Pace, not duration, is the constant. A fixed duration looks consistent in
 * the code and is anything but on screen — the same 1.4s spent covering one
 * screen and then two makes the second journey twice as fast, and a journey
 * whose start point varies (anywhere within a screen's resting stretch, say)
 * comes out at a different speed every time it's taken.
 */
export const SCROLL_SPEED_PX_PER_S = 550;
/** Floor and ceiling, so a nudge isn't glacial and a long haul isn't a wait. */
export const SCROLL_MIN_MS = 900;
export const SCROLL_MAX_MS = 2800;

/** How long the site takes to carry the page a given distance. */
export const scrollDurationFor = (distance: number) =>
  Math.min(
    Math.max((Math.abs(distance) / SCROLL_SPEED_PX_PER_S) * 1000, SCROLL_MIN_MS),
    SCROLL_MAX_MS
  );

const travel = cubicBezier(...EASE_TRAVEL);

/** Wheel movement that counts as "I'll take it from here". */
const CANCEL_WHEEL_PX = 40;
/** Keys that mean the same thing. */
const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Teardown for the guided scroll currently in flight, if there is one. */
let stopActiveScroll: (() => void) | null = null;

/** Ends any guided scroll immediately, leaving the page where it got to. */
export function cancelPageScroll() {
  stopActiveScroll?.();
}

/**
 * Scrolls the window to `targetY` on the site's curve, at the site's pace.
 * Pass `duration` only to override that pace deliberately.
 *
 * The browser's own `behavior: "smooth"` is used nowhere here: its duration
 * isn't controllable and differs per engine, which is exactly the
 * inconsistency this exists to remove. Real scroll input from the user
 * cancels the animation — being carried somewhere should never mean losing
 * the wheel.
 */
export function scrollPageTo(targetY: number, duration?: number) {
  // Never let two of these run at once: they'd each fight for the scroll
  // position every frame, and the second would restore the wrong CSS
  // scroll-behavior when it finished.
  cancelPageScroll();

  const startY = window.scrollY;
  const distance = targetY - startY;

  if (prefersReducedMotion() || Math.abs(distance) < 2) {
    window.scrollTo(0, targetY);
    return;
  }

  const totalMs = duration ?? scrollDurationFor(distance);

  const root = document.documentElement;
  // The stylesheet sets `scroll-behavior: smooth` globally, which would make
  // the browser re-animate every frame we set here. Step out of it for the
  // duration and put it back afterwards.
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";

  let frame = 0;
  const startedAt = performance.now();

  // A hand resting on a trackpad emits a trickle of one-pixel wheel events, and
  // a journey that surrenders to those reads as one that randomly gives up
  // partway. Take over on a real push, not on a twitch.
  let wheelSinceStart = 0;
  const onWheel = (e: WheelEvent) => {
    wheelSinceStart += Math.abs(e.deltaY);
    if (wheelSinceStart > CANCEL_WHEEL_PX) stop();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (SCROLL_KEYS.has(e.key)) stop();
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    root.style.scrollBehavior = previousBehavior;
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", onKeyDown);
    if (stopActiveScroll === stop) stopActiveScroll = null;
  };
  stopActiveScroll = stop;

  window.addEventListener("wheel", onWheel, { passive: true });
  // A finger on the glass is unambiguous, so that one hands over at once.
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", onKeyDown);

  const step = (now: number) => {
    const progress = Math.min((now - startedAt) / totalMs, 1);
    window.scrollTo(0, startY + distance * travel(progress));
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    } else {
      stop();
    }
  };

  frame = requestAnimationFrame(step);
}

/**
 * Jump to the top with no animation, ignoring the stylesheet's global
 * `scroll-behavior: smooth`. For the moment one screen has been replaced by
 * another: there's nothing on screen to animate, and animating would only
 * show the outgoing page racing upwards.
 */
export function jumpPageToTop() {
  cancelPageScroll();
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  root.style.scrollBehavior = previousBehavior;
}

/** Same as scrollPageTo, but aimed at an element's top edge. */
export function scrollPageToElement(el: Element, duration?: number) {
  scrollPageTo(el.getBoundingClientRect().top + window.scrollY, duration);
}
