"use client"

import type { FC, SVGProps } from "react"
import { useEffect, useRef, useCallback } from "react"
import createGlobe from "cobe"

interface FlightArc {
  id: string
  from: [number, number]
  to: [number, number]
  // What is travelling this route. Given one of the catalogue's own garment
  // icons, the arc carries the piece; without one it falls back to a plain dot,
  // so the globe still works for any other caller.
  icon?: FC<SVGProps<SVGSVGElement>>
}

interface FlightMarker {
  id: string
  location: [number, number]
}

interface GlobeFlightsProps {
  arcs?: FlightArc[]
  markers?: FlightMarker[]
  className?: string
  speed?: number
}

const defaultArcs: FlightArc[] = [
  { id: "flight-1", from: [40.64, -73.78], to: [51.47, -0.46] },
  { id: "flight-2", from: [51.47, -0.46], to: [25.25, 55.36] },
  { id: "flight-3", from: [35.55, 139.78], to: [37.62, -122.38] },
  { id: "flight-4", from: [1.36, 103.99], to: [-33.95, 151.18] },
  { id: "flight-5", from: [48.86, 2.35], to: [40.64, -73.78] },
]

// The markers are pinned to the arcs by CSS Anchor Positioning: cobe drops a
// 1px `anchor-name` div per arc, and the marker below resolves `anchor(top)` /
// `anchor(center)` against it. Where that isn't supported (Safari, so every iOS
// browser, and Firefox), those two declarations are simply dropped while cobe's
// visibility custom property still resolves — which would leave all five markers
// piled up in one corner of the globe, visible. So they render only where the
// browser can actually place them; the globe and its arcs are unaffected.
// Support can't change mid-session, so this is worked out once.
const supportsAnchorPositioning =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("position-anchor: --a")

const defaultMarkers: FlightMarker[] = [
  { id: "apt-jfk", location: [40.64, -73.78] },
  { id: "apt-lhr", location: [51.47, -0.46] },
  { id: "apt-dxb", location: [25.25, 55.36] },
  { id: "apt-nrt", location: [35.55, 139.78] },
  { id: "apt-sfo", location: [37.62, -122.38] },
  { id: "apt-sin", location: [1.36, 103.99] },
  { id: "apt-syd", location: [-33.95, 151.18] },
  { id: "apt-cdg", location: [48.86, 2.35] },
]

// --- The feel of it ---
// Drag is measured in globe radii, not pixels: travel one radius across the face
// and it turns one radian. That's what makes it read as a held object rather
// than a slider — and because the radius is read off the rendered box, it holds
// whatever size the globe is drawn at.
const DRAG_PHI = 1 // horizontal: the surface keeps up with the cursor
const DRAG_THETA = 0.62 // vertical: softer on purpose, this axis has ends to it
const MAX_TILT = 1 // ~57°, stopping short of the poles where the map smears
// What a throw does after release. Decay is per 60fps frame: 0.94 coasts for
// somewhere over a second, between ice and treacle.
const FRICTION = 0.94
const MIN_SPIN = 0.00004 // slower than this and the throw is over
// A ceiling on what can be thrown — about three turns a second, which a hand
// flick doesn't reach. It's here for the trackpad that delivers 1000px in one
// event, where an uncapped throw would leave the globe an unreadable blur.
const MAX_SPIN = 0.3
// The idle rotation returns over roughly a second once the throw has died, so
// the globe never cuts from coasting to its own spin.
const AUTO_RETURN = 0.025
// The lean toward a cursor that hasn't pressed yet. Small on purpose: it should
// register as the globe noticing you, not as a second way to rotate it.
const HOVER_PHI = 0.055
const HOVER_THETA = 0.035
const HOVER_REACH = 2.4 // radii from center at which the lean has faded to nothing
const HOVER_EASE = 0.05 // per-frame approach to that lean
const FRAME = 1000 / 60

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
// Frame-rate independent version of `current += (target - current) * ease`.
const approach = (current: number, target: number, ease: number, step: number) =>
  current + (target - current) * (1 - Math.pow(1 - ease, step))

export function GlobeFlights({
  arcs = defaultArcs,
  markers = defaultMarkers,
  className = "",
  speed = 0.003,
}: GlobeFlightsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Where the globe is, and where it's going. All of this is refs and read once
  // per frame by the render loop: a drag must never re-render React, or the
  // tracking picks up exactly the lag this is meant to avoid.
  const phiRef = useRef(0)
  const thetaRef = useRef(0.2) // matches the theta the globe is created with
  const spinRef = useRef({ phi: 0, theta: 0 }) // carried velocity, per frame
  const autoBlendRef = useRef(1) // how much of the idle rotation is applied

  // The drag in progress: which pointer owns it, and where it was last seen.
  const dragRef = useRef<{ id: number; x: number; y: number; at: number } | null>(null)
  // Radius of the globe as drawn, including any transform an ancestor applies —
  // the cursor is moving over the rendered thing, not the layout box.
  const radiusRef = useRef(0)
  const centerRef = useRef({ x: 0, y: 0 })
  // Not 0: a cursor that reaches the globe inside the first 200ms of the page
  // would be throttled out of the very first measurement and get no lean until
  // it moved again.
  const measuredAtRef = useRef(Number.NEGATIVE_INFINITY)

  const leanRef = useRef({ phi: 0, theta: 0 })
  const leanTargetRef = useRef({ phi: 0, theta: 0 })

  const measure = useCallback((force = false) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const now = performance.now()
    // Cheap enough to take on demand, expensive enough not to take per mousemove.
    if (!force && now - measuredAtRef.current < 200) return
    const rect = canvas.getBoundingClientRect()
    radiusRef.current = rect.width / 2
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    measuredAtRef.current = now
  }, [])

  const endDrag = useCallback((keepSpin: boolean) => {
    if (!dragRef.current) return
    dragRef.current = null
    if (!keepSpin) spinRef.current = { phi: 0, theta: 0 }
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      measure(true)
      // Catch it: whatever it was coasting at stops under the finger, which is
      // what makes grabbing a spinning globe feel like grabbing an object.
      spinRef.current = { phi: 0, theta: 0 }
      autoBlendRef.current = 0
      leanTargetRef.current = { phi: 0, theta: 0 }
      dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now() }
      // The drag keeps following the pointer past the edge of the globe, and the
      // release still arrives if it happens somewhere else entirely.
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = "grabbing"
    },
    [measure]
  )

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.id !== e.pointerId) return
    // Throttled inside: the globe is scaled by the scroll while all this is
    // going on, and a drag that outlives a resize should still track it.
    measure()
    const radius = radiusRef.current || 1
    const now = performance.now()

    const dPhi = ((e.clientX - drag.x) / radius) * DRAG_PHI
    const dTheta = ((e.clientY - drag.y) / radius) * DRAG_THETA

    // Applied straight to the rotation rather than eased into it: the surface is
    // wherever the cursor has dragged it to, this frame, with nothing in between.
    phiRef.current += dPhi
    const tilted = clamp(thetaRef.current + dTheta, -MAX_TILT, MAX_TILT)
    const tiltApplied = tilted !== thetaRef.current + dTheta
    thetaRef.current = tilted

    // Speed of the throw, in the same per-frame units the coast uses. Smoothed,
    // because a single mouse event is a noisy way to measure a hand's movement,
    // and the last one before release is often the noisiest.
    const frames = clamp((now - drag.at) / FRAME, 0.5, 4)
    spinRef.current = {
      phi: clamp(approach(spinRef.current.phi, dPhi / frames, 0.45, 1), -MAX_SPIN, MAX_SPIN),
      // Nothing to carry once the tilt is against its stop.
      theta: tiltApplied
        ? 0
        : clamp(approach(spinRef.current.theta, dTheta / frames, 0.45, 1), -MAX_SPIN, MAX_SPIN),
    }

    drag.x = e.clientX
    drag.y = e.clientY
    drag.at = now
  }, [measure])

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (dragRef.current?.id !== e.pointerId) return
      // Let go of it and it carries on, then slows: see the loop below.
      endDrag(true)
    },
    [endDrag]
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (dragRef.current?.id !== e.pointerId) return
      // The browser has taken the gesture to scroll the page with. Drop the
      // throw as well — a globe spinning off while the page moves under it is
      // not something the person asked for.
      endDrag(false)
    },
    [endDrag]
  )

  // --- The lean toward the cursor, before anything is pressed ---
  // Tracked on the window rather than the canvas so it responds to a cursor
  // approaching the globe, not only one already on it.
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const onMove = (e: PointerEvent) => {
      // Touch has no hover; a finger's position between taps means nothing.
      if (e.pointerType === "touch" || dragRef.current) return
      measure()
      const radius = radiusRef.current
      if (!radius) return
      const dx = (e.clientX - centerRef.current.x) / radius
      const dy = (e.clientY - centerRef.current.y) / radius
      const distance = Math.hypot(dx, dy)
      // Fades out with distance, so there's no line the globe visibly reacts at.
      const falloff = clamp(1 - distance / HOVER_REACH, 0, 1)
      leanTargetRef.current = {
        phi: clamp(dx, -1, 1) * HOVER_PHI * falloff,
        theta: clamp(dy, -1, 1) * HOVER_THETA * falloff,
      }
    }
    const onLeave = () => {
      leanTargetRef.current = { phi: 0, theta: 0 }
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerleave", onLeave)
    window.addEventListener("blur", onLeave)
    return () => {
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("blur", onLeave)
    }
  }, [measure])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let animationId: number
    let lastFrame = performance.now()

    function init() {
      const width = canvas.offsetWidth
      if (width === 0 || globe) return

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width, height: width,
        phi: 0, theta: 0.2, dark: 0.05, diffuse: 1.5,
        mapSamples: 16000, mapBrightness: 8,
        baseColor: [0.98, 0.98, 1],
        markerColor: [0.3, 0.55, 0.95],
        glowColor: [0.94, 0.93, 0.91],
        markerElevation: 0,
        markers: markers.map((m) => ({ location: m.location, size: 0.02, id: m.id })),
        arcs: arcs.map((a) => ({ from: a.from, to: a.to, id: a.id })),
        arcColor: [0.35, 0.6, 1],
        arcWidth: 0.5, arcHeight: 0.25, opacity: 0.7,
      })

      function animate(now: number) {
        // Every rate below is written per 60fps frame and then scaled by how long
        // this frame actually took, so a throw decays over the same *time* on a
        // 120Hz phone as on a 60Hz laptop, and a dropped frame doesn't jolt it.
        const step = clamp((now - lastFrame) / FRAME, 0, 3)
        lastFrame = now

        if (!dragRef.current) {
          const spin = spinRef.current
          const decay = Math.pow(FRICTION, step)
          spin.phi *= decay
          spin.theta *= decay
          if (Math.abs(spin.phi) < MIN_SPIN) spin.phi = 0
          if (Math.abs(spin.theta) < MIN_SPIN) spin.theta = 0

          phiRef.current += spin.phi * step
          thetaRef.current = clamp(thetaRef.current + spin.theta * step, -MAX_TILT, MAX_TILT)

          // The idle spin only starts coming back once the throw has spent
          // itself, and then arrives as a fade rather than a switch.
          const settled = spin.phi === 0 && spin.theta === 0
          autoBlendRef.current = approach(autoBlendRef.current, settled ? 1 : 0, AUTO_RETURN, step)
          phiRef.current += speed * autoBlendRef.current * step
        }

        const lean = leanRef.current
        const target = dragRef.current ? { phi: 0, theta: 0 } : leanTargetRef.current
        lean.phi = approach(lean.phi, target.phi, HOVER_EASE, step)
        lean.theta = approach(lean.theta, target.theta, HOVER_EASE, step)

        globe!.update({
          phi: phiRef.current + lean.phi,
          theta: clamp(thetaRef.current + lean.theta, -MAX_TILT, MAX_TILT),
        })
        animationId = requestAnimationFrame(animate)
      }

      animationId = requestAnimationFrame(animate)
      setTimeout(() => canvas && (canvas.style.opacity = "1"))
    }

    if (canvas.offsetWidth > 0) {
      init()
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (globe) globe.destroy()
    }
  }, [markers, arcs, speed])

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
        style={{
          width: "100%", height: "100%", cursor: "grab", opacity: 0,
          transition: "opacity 1.2s ease", borderRadius: "50%",
          // The globe answers to a sideways drag; an up-or-down swipe is left to
          // the page, which is how anything under it is reached on a phone. The
          // browser decides which it is from the first movement, and tells us it
          // took the gesture by cancelling the pointer.
          touchAction: "pan-y",
          // The layer this sits in is inert by default (it spans the whole
          // screen); the globe itself is the part that answers the cursor, and
          // the rounded corners keep that to the sphere.
          pointerEvents: "auto",
        }}
      />
      {supportsAnchorPositioning && arcs.map((a) => {
        const Icon = a.icon
        return (
          <div
            key={a.id}
            style={{
              position: "absolute",
              // @ts-expect-error CSS Anchor Positioning
              positionAnchor: `--cobe-arc-${a.id}`,
              bottom: "anchor(top)",
              left: "anchor(center)",
              translate: "-50% 0",
              pointerEvents: "none" as const,
              opacity: `var(--cobe-visible-arc-${a.id}, 0)`,
              transition: "opacity 0.3s",
              // A miniature of the tiles scattered around the hero — same
              // rounded white chip, same soft shadow, a third of the size. The
              // outline filter the emoji needed is gone: the chip is what
              // separates the mark from the map now.
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "1.5rem",
              height: "1.5rem",
              borderRadius: "0.5rem",
              background: "rgba(255,255,255,0.94)",
              backdropFilter: "blur(4px)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.14), 0 4px 10px rgba(0,0,0,0.06)",
            }}
          >
            {Icon ? (
              <Icon
                style={{ width: "0.875rem", height: "0.875rem", color: "#111" }}
                aria-hidden
              />
            ) : (
              <span
                style={{
                  width: "0.3rem",
                  height: "0.3rem",
                  borderRadius: "9999px",
                  background: "#111",
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
