export interface IElasticConfig {
  /** Multiplier on the squash derived from follower lag. */
  strength: number
  /** Ceiling on the raw squash before `strength` is applied. */
  max: number
}
