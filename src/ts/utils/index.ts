// Bare isElement stays out on purpose: it is the base guard its two siblings
// refine, with no consumer of its own — a barrel line with zero consumers
// would only trip the unused-export analyzers.

export { hintFitScale } from './hintFitScale'
export { isHTMLElement, isStyledElement } from './isElement'
export { lerpFactor } from './lerpFactor'
export { resolveScale, usesTargetRef } from './resolveScale'
export { round1, round3 } from './round'
