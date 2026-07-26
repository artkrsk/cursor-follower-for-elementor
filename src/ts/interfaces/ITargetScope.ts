import type { ITargetRule } from './ITargetRule'

/** A group of rules sharing a scope selector. The scope is the widget root:
    triggers flatten against it, and anchors resolve within the nearest ancestor
    matching it — so `:scope` targets the specific hovered instance, not the
    first match on the page. */
export interface ITargetScope {
  scope: string
  rules: ITargetRule[]
}
