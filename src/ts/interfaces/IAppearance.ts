/** Resolved visual state for a merged payload — what the suite writes out. */
export interface IAppearance {
  /** Ratio of the base cursor size, or null when none was asked for or it can't
      be resolved. */
  scale: number | null
  highlight: boolean
}
