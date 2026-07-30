# Developer Reference

The public integration contract for themes, plugins and widget authors. It is deliberately small: four surfaces plus one kill-switch, all at the wire level. Everything here is **additive-only from 1.0** — keys are never renamed or repurposed, and unknown payload keys are ignored by the engine. The plugin's Elementor control machinery (Site Settings, the per-widget sections) is internal and may change freely; integrate against what's on this page, not against control IDs.

<script setup>
import rulesTarget from './demos/rules-target.html?raw'
import { engageOrbit, releaseOrbit } from './demos/magnetize-session'
</script>

## Discovery

The gate installs `window.artsCursor` at parse time on every device:

```ts
interface IArtsCursorGlobal {
  /** Resolves with the instance at engine init — possibly late (the engine
      loads on the first pointer signal) or never (touch device). */
  ready: Promise<ICursorFollower>
  get(): ICursorFollower | null
  version: string
}
```

The engine also dispatches a bubbling `arts-cursor:ready` CustomEvent on `document` (detail: the instance) at init. Two consumer patterns, both correct:

```ts
// Fire-and-forget — right for decorative effects. Absent engine, nothing happens.
window.artsCursor?.get()?.hideNativeCursor()

// Await — right when a session must not be missed. May never resolve on touch,
// so never gate critical work behind it.
const cursor = await window.artsCursor.ready
```

The synchronous "which world" signal is the `<html>` class — see [CSS](#css) below.

TypeScript consumers get every type on this page from the package itself: `import type { IArtsCursorGlobal, ICursorPayload } from '@arts/cursor-follower'`.

## Per-element payloads

One attribute, one JSON object — on any element you render:

```html
<a href="/work/aurora" data-arts-cursor-follower-target='{"shape":"pill","label":"View Project"}'>…</a>
```

Parsed once per element, matched via delegation — elements added later (AJAX, infinite scroll) need no re-init. Every key, all optional:

| Key | Value | Does |
|---|---|---|
| `magnetic` | `true` \| number | Pull the cursor onto the element; a number overrides the global strength |
| `scale` | `"80px"` \| `"target"` \| `{ref, factor, min?}` \| `false` | Cursor size over the element — px, the element's own rendered size, or a factor of `cursor`/`target` |
| `anchor` | selector | Resolved *inside* the element: the magnet's pull target when the hover zone is bigger than the visual target |
| `label` | string | Text riding the cursor. Written via `textContent` — safe for user-typed content |
| `shape` | `"pill"` | Morph the follower into a filled stadium hugging its content |
| `icon` | SVG/HTML string | Inline markup for the label's icon slot — **author-trusted**, never end-user input |
| `iconClass` / `iconUrl` | string | Same slot: webfont classes, or an image URL masked to take the cursor's text color (`iconUrl` wins) |
| `iconPosition` | `"before"` \| `"after"` | Which side of the label the icon sits on (default after) |
| `arrows` | `"horizontal"` \| `"vertical"` \| `"all"` \| `false` | Arrow glyphs around/inside the cursor |
| `arrowsPosition` | `"inside"` \| `"outside"` | Arrows inside the ring or outside its edge |
| `drag` | payload | A sub-payload pushed while a click-drag is held on the element (its own `drag` is ignored) |
| `dot` | `true` | A filled dot scales up at the anchor while pressed; rides the press channel |
| `highlight` | `true` \| `false` \| `{scale?, opacity?}` | Force, forbid, or tune the highlight for this element |
| `hideNativeCursor` | `true` | Hide the OS cursor over the element |
| `backgroundColor` / `borderColor` / `borderWidth` / `textColor` | string / number | Per-element color and stroke overrides |
| `offset` | `[x, y]` | Shift the whole cursor cluster off the pointer, in px |
| `className` | string | Extra classes on the cursor root while hovered |
| `showLoadingAnimation` / `showProgressCursor` | `true` | Enter the loading / progress state on hover |

Two behaviors you get without any attribute: interactive elements (`a`, `button`, `[role="button"]`, `.has-cursor-highlight`) auto-highlight, and `.no-cursor-highlight` opts one out. Localization is yours and upstream of the wire: wrap `label` in your own `__()` when printing the attribute from PHP.

## Server-side rules

For markup you don't render — other people's widgets, plugin output — add rules through the one PHP filter instead of attributes. The docs engine runs these exact rules; hover the card:

<CursorDemo :html="rulesTarget" />

<<< @/demos/rules-target.html

<<< @/demos/rules-filter-example.php

The grammar: `targetScopes` is a list of `{scope, rules}` groups. `scope` is the component root; each rule's `selector` is resolved against it (`:scope` = the root, and the default when omitted). Semantics that make it composable:

- **Order is priority** — the first matching rule wins, so put narrow rules above broad ones (a rule for something inside a drag surface must come first).
- **Interactive elements protect themselves** — a rule matched on an *ancestor* never claims an element that is itself interactive; only a rule naming the element directly can. A track-wide drag rule can't swallow the links inside its slides.
- **`payload.anchor` is scope-relative** and resolves within the hovered instance.
- **`labelVar` / `iconVar`** name a CSS custom property on the scope element that replaces the rule's `label`/icon per instance — the channel for per-widget wording (`url(…)` values are masked images; anything else is webfont classes). Named per rule so one rule's label can never leak onto its siblings.
- Rules whose payload carries `highlight` drop out while the site-wide Highlight toggle is off.

The same filter carries the tuning keys (`trailing`, `elastic`, `magnetic`, `highlight`, `clickScale`) if you need to override Site Settings programmatically.

## Runtime API

`window.artsCursor.get()` returns the engine:

```ts
interface ICursorFollower {
  set(payload: ICursorPayload): ICursorSession
  loading(opts?: { size?: number }): ICursorSession
  progress(): ICursorSession
  hideNativeCursor(): ICursorSession
  magnetize(opts: IMagnetizeOptions): ICursorSession

  updateOptions(partial: ICursorOptions): void  // live-tune trailing/elastic/magnetic/highlight/clickScale
  warm(container?: ParentNode): void            // pre-measure hint after injecting large DOM
  remeasure(): void                             // re-sample measured theming vars after you change them

  on(event: 'target:enter' | 'target:leave' | 'enabled:change', cb): () => void

  readonly enabled: boolean
  readonly el: HTMLElement | null
}
```

Sessions **stack** — last wins per property, and releasing one restores whatever remains (other sessions, then hover state). Every session supports `release()` and `using` (`Symbol.dispose`).

`magnetize` is the programmatic magnet for live, moving anchors — no hover coupling, no distance release; the caller owns the lifecycle. Move the pointer into the zone below: the wiring magnetizes the cursor to the orbiting dot and rides it until you leave — the same recipe a production slider uses to keep the cursor caught on its drag knob:

<div class="cursor-demo"><div class="cursor-demo__stage"><div class="demo-orbit-zone" @pointerenter="engageOrbit" @pointerleave="releaseOrbit"><span class="demo-orbit-dot"></span></div></div><p class="cursor-demo__note">These demos need a mouse or trackpad — cursor effects stay off on touch devices.</p></div>

<<< @/demos/magnetize-session.ts

`getAnchor` returns **page** coordinates read once per frame. `strength` and `trailing` also accept per-frame functions — return `0` strength or `1` trailing to glue rigidly (e.g. while dragging), `null` for the configured defaults.

## CSS

**`<html>` classes.** Exactly one of `has-cursor-follower` / `no-cursor-follower` is always present — set pre-paint from the pointer media query, corrected by the engine if reality differs, flipped to `no-` on asset failure, and printed server-side when the site disables the cursor via the PHP filter. Key your fallback styling off them and touch devices, filtered pages and broken deploys all land in the same, handled state.

**Theming vars.** Six custom properties, styleable from any stylesheet:

```css
.arts-cursor {
  --arts-cursor-size: 64px;
  --arts-cursor-text-color: #fff;
  --arts-cursor-loading-color: #fff;
  --arts-cursor-border-width: 2px;
  --arts-cursor-border-color: #808080;
  --arts-cursor-background-color: transparent;
}
```

They are deliberately unregistered (no `@property`), so `var(--x, fallback)` chains keep working — set only what you need. These docs theme their own cursor this way, scoped to engine states (`.arts-cursor[data-cursor-highlight]`, `[data-cursor-shape='pill']`).

**The cascade layer.** Every rule the plugin ships lives in the `arts-cursor` layer, so any unlayered site CSS outranks it by definition — no specificity wars. Want a blend mode? One rule, no plugin option needed:

```css
.arts-cursor { mix-blend-mode: difference; }
```

## Disabling per request

Conditional loading enqueues nothing (the engine arrives through an inline gate), so there is no script handle to dequeue. The supported switch:

```php
add_filter( 'arts_cursor_follower/enabled', fn( $on ) => $on && ! is_checkout() );
```

Evaluated once per request, before output. A disabled request prints no gate and no globals, and `<html>` still gets `no-cursor-follower` (via `language_attributes`), so the class contract stays total — to your CSS, a filtered page is a touch page. The Elementor editor preview ignores the filter; it always shows the cursor.

## Sharing a frame loop

A host that owns a rAF loop can hand it to the engine instead of letting it run its own. The seam is script-side by design — set a ticker on the options global *before* the engine loads:

```ts
// Any script that runs before the engine bundle (the engine loads lazily on
// the first pointer signal, so app code is almost always early enough).
window.artsCursorFollowerOptions = {
  ...window.artsCursorFollowerOptions,
  ticker: myTicker // { subscribe(cb, opts?): () => void }
}
```

The adapter contract is one method — `subscribe(callback, { priority?, label? }): unsubscribe` — shape-compatible with tempus. Only `deltaTime` and `frameCount` are portable across implementations. Best-effort by nature: a pointer move that beats your deferred script boots the engine on its own rAF, which sleeps whenever the cursor converges.

## What stays out

No per-widget color/scale controls, no page-level override settings, no configurable attribute name, no panel extensibility for foreign widgets. Where those needs are real, this page's channels cover them: colors are CSS (the vars + the layer), wording is `labelVar`/your own `__()`, behavior is the payload or the filter.
