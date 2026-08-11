import type { ICursorEvents } from './ICursorEvents'
import type { ICursorOptions } from './ICursorOptions'
import type { ICursorPayload } from './ICursorPayload'
import type { ICursorSession } from './ICursorSession'
import type { ICursorStats } from './ICursorStats'
import type { ILoadingOptions } from './ILoadingOptions'
import type { IMagnetizeOptions } from './IMagnetizeOptions'

export interface ICursorFollower {
  init(): void
  destroy(): void

  /** Apply cursor state programmatically — the session composes over hover
      state and other sessions; release to restore. */
  set(payload: ICursorPayload): ICursorSession
  loading(opts?: ILoadingOptions): ICursorSession
  progress(): ICursorSession
  hideNativeCursor(): ICursorSession
  /** Magnet the cursor to a live (possibly moving) anchor until released. */
  magnetize(opts: IMagnetizeOptions): ICursorSession

  /** Live-tune feel parameters (trailing, elastic, magnetic). */
  updateOptions(partial: ICursorOptions): void
  /** Optional pre-measure hint after injecting large DOM subtrees. */
  warm(container?: ParentNode): void
  /** Re-sample the measured theming vars (size, border width, pill padding,
      label metrics) after the host changes them at runtime. */
  remeasure(): void

  on<E extends keyof ICursorEvents>(event: E, cb: ICursorEvents[E]): () => void

  /** Fine-pointer environment active (media-query gated). */
  readonly enabled: boolean
  readonly stats: Readonly<ICursorStats>
  readonly el: HTMLElement | null
}
