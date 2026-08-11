export interface ICursorRefs {
  root: HTMLElement
  follower: HTMLElement | null
  hint: HTMLElement | null
  /** The hint's text and icon slots (built markup only; null on adopted markup
      that lacks them — text then falls back to `hint`, and there's no icon). */
  hintText: HTMLElement | null
  hintIcon: HTMLElement | null
  /** True when the engine created the tree (and should remove it on destroy). */
  built: boolean
}
