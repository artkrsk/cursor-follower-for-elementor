export interface ICursorRefs {
  root: HTMLElement
  follower: HTMLElement | null
  label: HTMLElement | null
  /** The label's text and icon slots (built markup only; null on adopted markup
      that lacks them — text then falls back to `label`, and there's no icon). */
  labelText: HTMLElement | null
  labelIcon: HTMLElement | null
  icon: HTMLElement | null
  /** True when the engine created the tree (and should remove it on destroy). */
  built: boolean
}
