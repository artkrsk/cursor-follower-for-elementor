import type { ICursorElementAttachment } from './ICursorElementAttachment'
import type { ICursorElementOptions } from './ICursorElementOptions'
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
  /** Attach decorative content after init. Initial activation is deferred one frame. */
  attachElement(opts: ICursorElementOptions): ICursorElementAttachment

  /** Live-tune feel parameters (trailing, elastic, magnetic). */
  updateOptions(partial: ICursorOptions): void
  /** Optional pre-measure hint after injecting large DOM subtrees. */
  warm(container?: ParentNode): void
  /** Re-sample the measured theming vars (size, hint padding, arrow box + gap,
      label metrics) after the host changes them at runtime. */
  remeasure(): void
  /** Re-resolve the hovered element after the HOST changed what its rules
      match — a class toggled under a still pointer is otherwise unseen until
      the pointer leaves and returns. Also runs automatically one frame after
      any click. When the same target survives, `target:refresh` fires instead
      of a re-enter, so it is safe to call on any state change. */
  refresh(): void

  on<E extends keyof ICursorEvents>(event: E, cb: ICursorEvents[E]): () => void

  /** Fine-pointer environment active (media-query gated). */
  readonly enabled: boolean
  readonly stats: Readonly<ICursorStats>
  readonly el: HTMLElement | null
}
