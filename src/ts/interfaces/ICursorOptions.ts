import type { IAnimationConfig } from './IAnimationConfig'
import type { IElasticConfig } from './IElasticConfig'
import type { IHighlightConfig } from './IHighlightConfig'
import type { IMagneticConfig } from './IMagneticConfig'
import type { IPressScaleConfig } from './IPressScaleConfig'
import type { ITargetScope } from './ITargetScope'
import type { ITickerAdapter } from './ITickerAdapter'

export interface ICursorOptions {
  /** Trailing smoothing: fraction of the remaining distance covered per 60 Hz frame. */
  trailing?: number
  elastic?: Partial<IElasticConfig> | false
  magnetic?: Partial<IMagneticConfig> | false
  highlight?: Partial<IHighlightConfig> | false
  pressScale?: Partial<IPressScaleConfig> | false
  /** Attribute holding per-item JSON payloads. */
  attribute?: string
  /** Declarative rules grouped by scope selector, resolved on hover (e.g. Elementor widget defaults). */
  targetScopes?: ITargetScope[]
  animation?: Partial<IAnimationConfig>
  /** Frame source. Shape-compatible with tempus and with `@arts/component-runtime`'s
      ITicker, so a host that owns the loop can share it. */
  ticker?: ITickerAdapter
  /** Existing cursor markup to verify; engine builds its own tree when absent. */
  root?: Element | string | null
}
