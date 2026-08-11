/** Drives the CSS transition tokens (--arts-cursor-duration/--arts-cursor-ease). */
export interface IAnimationConfig {
  /** Seconds. */
  duration: number
  /** null keeps the stylesheet's own easing token. */
  easing: string | null
}
