import type { IAnimationConfig } from './IAnimationConfig'
import type { IElasticConfig } from './IElasticConfig'
import type { IHighlightConfig } from './IHighlightConfig'
import type { IMagneticConfig } from './IMagneticConfig'
import type { IPressScaleConfig } from './IPressScaleConfig'
import type { ITargetScope } from './ITargetScope'

/**
 * The config the frame path holds and applyOptionPatch mutates in place. Neither
 * injectable is here: the composition root reads `ticker` at construction and
 * `root` at each init, straight off the user's options.
 */
export interface IResolvedOptions {
  trailing: number
  elastic: IElasticConfig | false
  magnetic: IMagneticConfig | false
  highlight: IHighlightConfig | false
  pressScale: IPressScaleConfig | false
  attribute: string
  targetScopes: ITargetScope[]
  animation: IAnimationConfig
}
