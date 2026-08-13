# Effects

Every effect in the library, live on this page — hover the demos with a mouse or trackpad, and copy the exact markup that reproduces each one. The examples build up from the simplest real-world shapes: each is a pattern the plugin itself ships for Elementor widgets.

<script setup>
import magneticIcon from './demos/magnetic-icon.html?raw'
import magneticButton from './demos/magnetic-button.html?raw'
import highlight from './demos/highlight.html?raw'
import label from './demos/label.html?raw'
import pillCard from './demos/pill-card.html?raw'
import dragStrip from './demos/drag-strip.html?raw'
import magneticAnchor from './demos/magnetic-anchor.html?raw'
import { toggleLoading } from './demos/loading-session'
</script>

## Magnetic

The element carries one JSON attribute; the engine pulls the cursor onto it while the pointer is near. What the cursor *does* while pulled is the design decision — the two shapes below are the ones the plugin ships for icons and buttons.

### An icon the cursor traps

`"scale": "target"` sizes the ring to the element's real rendered size — exactly the icon's circle. On hover the icon's own barely-visible border fades out (one CSS rule keyed on the `has-cursor-follower` class the engine sets on `<html>`), and the ring takes its place at the same radius: the circle appears to come alive and hold the icon. On touch devices there is no ring, so the border stays.

<CursorDemo :html="magneticIcon" />

<<< @/demos/magnetic-icon.html

### A button the cursor collapses on

A button draws its own outline — a ring sitting across it reads as two shapes arguing. So the cursor collapses (`"scale": "0px"`) while the magnet pulls, and the button's own hover state is the feedback. This is exactly the payload the plugin ships for the Elementor Button widget.

`"elementScale": 0.95` adds the other half of that feedback: the button itself gives a little, from its center, for as long as the magnet holds it. Set it site-wide under Site Settings → Magnetic → Element Scale, or per element as here. While the mouse button is down the press ratio takes over the same property, so a press stays one consistent depth rather than compounding.

<CursorDemo :html="magneticButton" />

<<< @/demos/magnetic-button.html

## Highlight

The freebie: links and buttons need **no attribute at all** — anything interactive gets the highlight automatically. Opt an element out with the `no-cursor-highlight` class, or tune the highlight per element through the payload.

<CursorDemo :html="highlight" />

<<< @/demos/highlight.html

## Labels

A label names what a click will do. On its own it rides the follower as text; with `"shape": "pill"` it becomes the labeled pill the plugin ships for linked images, portfolio cards and slides.

<CursorDemo :html="label" />

<<< @/demos/label.html

<CursorDemo :html="pillCard" />

<<< @/demos/pill-card.html

## Drag hint

The payload the plugin writes for every carousel track and the lightbox: a pill promising a drag, arrows joining in while the gesture is held. Press and drag the strip.

<CursorDemo :html="dragStrip" />

<<< @/demos/drag-strip.html

## Anchor redirection

The hover zone and the pull target don't have to be the same element: `"anchor"` is a selector resolved inside the carrying element, and the magnet pulls toward *it*. This is how a wide edge-navigation strip magnetizes to its small glyph.

<CursorDemo :html="magneticAnchor" />

<<< @/demos/magnetic-anchor.html

## Programmatic states

Everything above is markup. The same engine is scriptable through `window.artsCursor` — sessions stack and release cleanly. The button runs exactly the module shown below.

<p>
  <button type="button" @click="toggleLoading">Toggle the loading state</button>
</p>

<<< @/demos/loading-session.ts

More on sessions, events and the rules filter in the [Developer Reference](/developers).
