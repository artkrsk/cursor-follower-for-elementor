import type { TKitSettingKey } from './TKitSettingKey'

/**
 * Values stay `unknown`: what arrives is Elementor's whole kit attribute bag,
 * forwarded from the editor window as a CustomEvent detail, so the shapes are
 * not this package's to assert. The key names are — and they are what silently
 * breaks when a control is renamed.
 */
export type TKitSettings = { [K in TKitSettingKey]?: unknown }
