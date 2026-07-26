import type { TArrowAxis } from '../types/TArrowAxis'
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
      disables clickScale never shows it. The dot replaces the pointer: a
      stylesheet :has() rule hides the native cursor from the first press —
      keep drag.hideNativeCursor alongside as the fallback for engines
      without :has(), where the hide starts at the drag threshold. */
  dot?: boolean
  backgroundColor?: string
  borderColor?: string
  /** Ring stroke width. Rendered optically constant under the cursor's scale —
      the stylesheet divides the width var by the scale var. */
  borderWidth?: number | string
  className?: string
  /** A cursor sub-state pushed as a session while a click-drag is in progress on
      this target — e.g. a carousel that hovers a "Drag" pill and shows arrows
      while dragging. Its own nested `drag` is ignored. */
  drag?: ICursorPayload
  textColor?: string
  hideNativeCursor?: boolean
  highlight?: boolean | Partial<IHighlightConfig>
  /** Raw SVG/HTML injected (author-trusted) into the label's icon slot, rendered
      inline with the label — before or after per `iconPosition`. */
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
      lift a label clear of the OS cursor. Overrides the auto label nudge. */
  offset?: [number, number]
  scale?: TScaleValue | false
  /** `'pill'` morphs the follower into a filled stadium hugging its content —
      a label, an icon, or an inside arrow pair (effects/suite.ts decides,
      demotion cases included); with nothing to hug it falls back to the
      circle. Default circle. */
  shape?: 'circle' | 'pill'
  showLoadingAnimation?: boolean
  showProgressCursor?: boolean
}
