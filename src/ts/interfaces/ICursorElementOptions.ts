import type { IAnimationConfig } from './IAnimationConfig'
import type { ICursorPayload } from './ICursorPayload'
import type { IElasticConfig } from './IElasticConfig'

export interface ICursorElementOptions {
  /** Decorative content. Interaction remains on the trigger. */
  element: HTMLElement
  trigger: HTMLElement | { root: HTMLElement; selector: string }
  container?: HTMLElement
  rest?: 'home' | 'hidden'
  follow?: boolean
  anchor?: [number, number]
  offset?: [number, number]
  trailing?: number
  elastic?: Partial<IElasticConfig> | false
  animation?: Partial<IAnimationConfig>
  /** Custom presentation uses frame.reveal; positioning remains engine-owned. */
  reveal?: 'scale' | 'custom'
  /** Overrides the default suppression session. false leaves the page cursor alone. */
  cursor?: ICursorPayload | false
}
