/**
 * Arts Cursor Follower for Elementor — the cursor engine.
 * Zero-dependency, compositor-first cursor follower.
 */

/// <reference path="./env.d.ts" />

export type * from './contract'
export { createCursor } from './core/createCursor'
export { createCursorApp } from './createCursorApp'
export { resolveScale } from './utils'
