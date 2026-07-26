import type { ICursorPayload } from './ICursorPayload'
import type { ITargetRule } from './ITargetRule'

/** A target rule with its trigger already flattened against the group scope.
    `anchor`/`labelVar`/`iconVar` are required-but-possibly-undefined rather than
    optional: the compiler copies them straight off the source rule's optional
    fields, and for this internal record "absent" and "stated undefined" are
    the same thing. */
export interface ICompiledRule {
  scope: string
  trigger: string
  anchor: string | undefined
  payload: ICursorPayload
  source: ITargetRule
  labelVar: string | undefined
  iconVar: string | undefined
  /** Is this rule's effect currently enabled? Refreshed per crossing. */
  active: boolean
}
