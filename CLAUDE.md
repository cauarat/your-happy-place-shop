# Villaoro — project rules

## No "Edit with Lovable" badge

The site ships without the Lovable badge. It is never visible, in any
environment, to anyone.

The badge is **not in this repo** — Lovable's host layer injects
`<aside id="lovable-badge">` (and `https://cdn.gpteng.co/lovable.js`) into the
HTML it serves, so there is no tag here to delete. It is instead held
permanently in the state its own Dismiss button produces
(`class="closing"` + `display: none`), in two places:

- [index.html](index.html) — a `<style>` block plus a small script in `<head>`.
  This is the one that matters: it applies before first paint, so the badge
  never flashes.
- [src/index.css](src/index.css) — the same CSS rule, at the end of the file and
  deliberately outside any `@layer`. A duplicate on purpose: it travels with the
  bundle if a Lovable sync ever rewrites `index.html`.

Both are marked `PROJECT RULE — do not remove`. Keep both. If one goes missing,
restore it rather than relying on the other.

The badge can also be turned off in Lovable's own project settings, which stops
the markup being injected at all. Do that as well when the plan allows it — but
do not remove the rules above in exchange, since they are what guarantees the
result from the code side.
