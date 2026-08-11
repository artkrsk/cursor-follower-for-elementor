import type { TStateVarKey } from '../types/TStateVarKey'
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
  /** Payload STATE taken per-instance from custom properties on the hovered
      scope element — the same channel as `labelVar`/`iconVar`, for the keys that
      name a CSS state rather than content. `none` drops the key (so the rule's
      own default can't reassert), an empty property leaves the payload alone.

      This is the only per-instance channel that survives NESTING: the property
      is read off the nearest matching scope, whereas a marker class in the
      trigger selector is not — `closest()` walks straight past a nearer scope
      that lacks the class and matches a farther one that has it. */
  stateVars?: Partial<Record<TStateVarKey, string>>
}
