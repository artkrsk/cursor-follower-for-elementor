import type { IAnimationConfig } from './IAnimationConfig'
import type { IClickScaleConfig } from './IClickScaleConfig'
import type { IElasticConfig } from './IElasticConfig'
import type { IHighlightConfig } from './IHighlightConfig'
import type { IMagneticConfig } from './IMagneticConfig'
import type { ITargetScope } from './ITargetScope'

/**
 * The config the frame path holds and applyOptionPatch mutates in place. Neither
 * injectable is here: `ticker` and `root` are consumed once at construction by
 * the composition root, straight off the user's options.
 */
export interface IResolvedOptions {
  trailing: number
  elastic: IElasticConfig | false
  magnetic: IMagneticConfig | false
  highlight: IHighlightConfig | false
  clickScale: IClickScaleConfig | false
  attribute: string
  targetScopes: ITargetScope[]
  animation: IAnimationConfig
}
