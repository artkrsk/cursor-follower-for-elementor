import type { ICursorPayload } from './ICursorPayload'

/** A rule inside a scope group. `selector` is resolved relative to the group
    scope — `:scope` refers to the scope root and is the default when omitted
    (trigger on the whole scope). `payload.anchor` (also scope-relative) redirects
    the effect to another element resolved within the hovered scope instance. */
export interface ITargetRule {
  selector?: string
  payload: ICursorPayload
  /** CSS custom property on the hovered scope element that replaces
      `payload.label` for this instance. Named per rule, so a scope's other rules
      never pick a label up — a carousel's Drag label must not land on its
      magnetic arrows. */
  labelVar?: string
  /** Custom property carrying a per-instance ICON, same channel and the same
      per-rule naming as `labelVar`. One var for both forms because a host can
      only substitute one value per property: a `url(…)` is masked (and so takes
      the cursor's colour), anything else is read as webfont classes. */
  iconVar?: string
}
