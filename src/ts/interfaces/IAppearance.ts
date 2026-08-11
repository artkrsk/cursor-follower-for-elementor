/** Resolved visual state for a merged payload — what the suite writes out. */
export interface IAppearance {
  /** Ratio of the base cursor size, or null when unresolvable. */
  scale: number | null
  highlight: boolean
}
