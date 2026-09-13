/**
 * Arts Cursor Follower for Elementor — the cursor engine.
 * Zero-dependency, compositor-first cursor follower.
 */

export { createCursor } from './core/createCursor'
export type {
  IAnimationConfig,
  IArtsCursorGlobal,
  ICursorDragBinding,
  ICursorDragOptions,
  ICursorEvents,
  ICursorFollower,
  ICursorObserveOptions,
  ICursorOptions,
  ICursorPayload,
  ICursorSession,
  ICursorStats,
  IElasticConfig,
  IHighlightConfig,
  ILoadingOptions,
  IMagneticConfig,
  IMagnetizeOptions,
  IPressScaleConfig,
  ITargetContext,
  ITargetRule,
  ITargetScope,
  ITickerAdapter,
  ITickerSubscribeOptions,
  IVec2
} from './interfaces'
export type {
  TArrowAxis,
  TBootOptions,
  TCursorDragState,
  TCursorObserver,
  TDragPayload,
  TKitSettings,
  TPressPayload,
  TScaleValue,
  TStateVarKey,
  TTickerCallback
} from './types'
export { resolveScale } from './utils'
