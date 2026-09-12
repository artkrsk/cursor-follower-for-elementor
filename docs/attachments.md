# Element attachments

Attach a styled element to a hover region. The cursor owns pointer input, following,
elastic motion, return and cleanup. Your component owns its content and appearance.

<script setup>
import ElementAttachmentsDemo from './.vitepress/theme/components/ElementAttachmentsDemo.vue'
</script>

<ElementAttachmentsDemo />

## Home or hidden

`cursor.attachElement({ element, trigger })` moves the original decorative element from
its authored position. A noninteractive layout replica holds that position while it
follows. On leave, it returns to the replica's **live** position. `hide()` returns and
shrinks simultaneously; `show()` reveals it at home without immediately recapturing.

Use `rest: 'hidden'` for a hover-only preview. It appears at the pointer on entry and
hides at its last position on leave. No home placeholder is needed. Its markup should
start visually hidden so it also degrades correctly before the engine loads or on touch.

The trigger can be one element or `{ root, selector }`. Delegation supports appended
items and a single shared preview. Direct crossings between matched items emit
`target:change` without a hide/show cycle. Use `cursor.refresh()` after changing matches
under a stationary pointer.

## Configuration

| Option | Default / behavior |
| --- | --- |
| `element` | Required decorative HTML content; links and focus stay on the trigger |
| `trigger` | Required element or `{ root: HTMLElement, selector: string }` |
| `container` | Trigger/root; use a local, unclipped, positioned container to preserve theme inheritance |
| `rest` | `'home'`, or `'hidden'` for a preview |
| `follow` | `true`; `false` retains activation/suppression without movement |
| `anchor` | `[0.5, 0.5]`; fractions locating the attachment point, physically left/top to right/bottom |
| `offset` | Inherited hint offsets; override with signed pixel `[x, y]` |
| `trailing`, `elastic`, `animation` | Inherit live cursor settings; supplied fields override them |
| `reveal` | `'scale'`; `'custom'` lets `frame.reveal` drive your inner content |
| `cursor` | Session overrides, or `false` to leave the page cursor alone |

By default the attachment claims `{ hidden: true, hideNativeCursor: false,
showProgressCursor: false, dot: false }`. `hidden` hides the **whole** cursor graphic;
`scale: 0` only collapses its ring. Sessions keep their ordinary last-wins composition.

Call `attachElement` after `init()` (or discovery readiness). Initial reconciliation is
deferred to the next frame so synchronous subscribers can observe entry. One live
attachment may own a given element. Invalid selectors and duplicate attachment fail
before the element is moved.

## Lifecycle and interaction hooks

The handle exposes `pause()`, `resume()`, `hide()`, `show()`, `destroy(revert = true)`,
`following`, and `on(event, callback)` returning an unsubscribe function. Pause and
visibility are independent: showing a paused attachment does not resume it. Resume
and show require subsequent pointer input before reacquisition.

Subscribe to `enter`, `target:change`, `move`, `frame`, `leave`, or
`following:change`. Target change receives `(frame, previousTrigger)`; following change
receives a boolean; the other events receive the borrowed frame view:

- `trigger`: current/last matched element, retained through the exit animation.
- `pointer`: raw viewport coordinates; `position`: smoothed viewport attachment point.
- `delta`: raw pointer displacement since the previous delivered frame.
- `local`: trigger-local CSS pixels; `progress`: clamped `[0, 1]` coordinates within its box.
- `deltaTime`: milliseconds; `frameCount`: ticker frame count, independent of clock epoch.
- `reveal`: eased visibility; expansion can exceed 1, collapse never goes below 0.
- `signal`: aborted on target replacement, leave or destruction; guard asynchronous media work with it.

`move` is coalesced to at most once per frame. `frame` continues during return and reveal
transitions. These views are reused: **copy coordinates before retaining them**. Hooks
are synchronous notifications; the engine does not await promises. A normal-flow
placeholder tracks content changes and responsive class-based layout. The engine
temporarily owns the decorative element's positioning/transform properties; animate
its children instead. Ancestor translation and positive scale are supported; rotation,
skew and perspective are not.

The standard scale reveal uses the cursor's CSS timing tokens; `animation` overrides
duration/easing. Supported JS timing curves are CSS keywords and `cubic-bezier()`;
unrecognized curves use linear timing. Home return always uses monotonic `ease-out`.

## Runnable consumer examples

The exact code driving the examples above:

<<< @/demos/element-attachments.html

<<< @/demos/element-attachments.ts

Distance-based selection is a consumer rule, not an engine feature. This example uses
displacement from the last switch point (not accumulated path length), with a threshold
of 7.5% of viewport width. The scrub example maps normalized horizontal position to
an image index. Both can reuse the same attachment machinery for unrelated content.

## Composing with a media library

Velum's `@arts/image-preview` can animate media **inside** the moving container:

```ts
const attachment = cursor.attachElement({
  element: panel,
  trigger: { root: list, selector: '.project' },
  rest: 'hidden',
  elastic: false,
  reveal: 'custom',
  animation: { duration: previewDuration }
})
const select = ({ trigger }) => preview.show(trigger)
attachment.on('enter', select)
attachment.on('target:change', select)
attachment.on('leave', () => preview.hide())
// Movement-driven selection can call preview.show(otherKey) from 'move'.
// Appended media use preview.grow(map); their triggers are already delegated.
```

The media library owns its image clip/scale/z-order and video playback. The cursor
owns the outer position. Configure the outer transition duration to encompass the
inner reveal/hide if you want to see it finish. Keep image loading and decoding in the
consumer, checking the interaction signal before applying a late result.

On teardown, stop attachment callbacks and forward `destroy(revert)` before allowing
new preview work. Keep the preview's existing animation-context and tween-registration
cleanup. Do not wait for overwriteable tween promises to release cursor ownership.
`destroy(false)` leaves outgoing local DOM alone but removes external motion overlays.
Feature-detect `attachElement` when integrating with an optional, separately updated plugin.
