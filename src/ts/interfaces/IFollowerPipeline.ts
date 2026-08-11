export interface IFollowerPipeline {
  /** The ticker's `time` is deliberately absent: only deltaTime and frameCount
      are portable across ticker implementations (an injected ticker may count
      from its own clock epoch). */
  frame(dt: number): void
  /** Snap follower to the current target without animation. */
  snap(): void
}
