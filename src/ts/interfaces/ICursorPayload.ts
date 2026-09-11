import type { TArrowAxis } from '../types/TArrowAxis'
import type { TDragPayload } from '../types/TDragPayload'
import type { TPressPayload } from '../types/TPressPayload'
import type { TScaleValue } from '../types/TScaleValue'
import type { IHighlightConfig } from './IHighlightConfig'

/** Per-item payload parsed from the data attribute. */
export interface ICursorPayload {
  /** Selector resolved INSIDE the matched element — the magnetic anchor/pull
      target when the hover zone is larger than the visual target. */
  anchor?: string
  arrows?: TArrowAxis | 'all' | false
  /** Whether the arrows sit inside or outside the ring edge. Default: inside. */
  arrowsPosition?: 'inside' | 'outside'
  /** Scale up a filled dot at the anchor while this target is pressed (the
      whole press-drag gesture). Rides the press channel, so a site that
      disables pressScale never shows it. The dot replaces the pointer: a
      stylesheet :has() rule hides the native cursor from the first press —
      keep drag.hideNativeCursor alongside as the fallback for engines
      without :has(), where the hide starts at the drag threshold. */
  dot?: boolean
  backgroundColor?: string
  borderColor?: string
  /** Ring stroke width. Rendered optically constant under the cursor's scale —
      the stylesheet divides the width var by the scale var. */
  borderWidth?: number | string
  /** A cursor sub-state pushed as a session while a click-drag is in progress on
      this target — e.g. a carousel that hovers a "Drag" pill and shows arrows
      while dragging. */
  drag?: TDragPayload
  /** A cursor sub-state composed only while the primary press is held over this
      target. Use it for a grab affordance that precedes the drag threshold. */
  press?: TPressPayload
  /** Magnetic only: the element's OWN resting scale while engaged, from its
      centre — overrides the global `magnetic.elementScale`. 1 leaves the
      element's CSS alone. A press overwrites it flat rather than compounding,
      so a value below the press ratio inverts the press into a grow. */
  elementScale?: number
  textColor?: string
  hideNativeCursor?: boolean
  highlight?: boolean | Partial<IHighlightConfig>
  /** Raw SVG/HTML injected (author-trusted) into the hint's icon slot, rendered
      inline with the label text — before or after per `iconPosition`. */
  icon?: string
  /** Icon-font classes for the same slot, for a glyph rather than markup — the
      webfont has to be on the page for it to render. */
  iconClass?: string
  /** An image URL masked into the same slot, so the icon takes the cursor's text
      colour rather than its own. Wins over `iconClass` when both are given. */
  iconUrl?: string
  /** Which side of the label the icon sits on. Default: after. */
  iconPosition?: 'before' | 'after'
  label?: string
  magnetic?: boolean | number
  /** Shift the whole cursor cluster off the pointer, in px `[x, y]` — e.g. to
      lift a label clear of the OS cursor. Overrides the auto nudge a hint
      (wording OR icon) otherwise applies. */
  offset?: [number, number]
  /** Long axis for a dot-only press pill. Label and arrow pills derive their
      axis from their content, so this has no effect outside that press state. */
  pillAxis?: TArrowAxis
  scale?: TScaleValue | false
  /** `'pill'` morphs the follower into a filled stadium hugging its content —
      a label, an icon, or an inside arrow pair (effects/suite.ts decides,
      demotion cases included); with nothing to hug it falls back to the
      circle. Default circle. */
  shape?: 'circle' | 'pill'
  showLoadingAnimation?: boolean
  showProgressCursor?: boolean
}
