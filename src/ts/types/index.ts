export type { TArrowAxis } from './TArrowAxis'
export type { TArrowDirection } from './TArrowDirection'
export type { TBootOptions } from './TBootOptions'
export type { TDragPayload } from './TDragPayload'
export type { TEventMap } from './TEventMap'
export type { TGateBoot } from './TGateBoot'
// TKitSettingKey stays out on purpose: it is internal to TKitSettings, which
// imports it directly — a barrel line with zero consumers would only trip the
// unused-export analyzers.
export type { TKitSettings } from './TKitSettings'
export type { TScaleValue } from './TScaleValue'
export type { TStateVarKey } from './TStateVarKey'
export type { TStyledElement } from './TStyledElement'
export type { TTickerCallback } from './TTickerCallback'
