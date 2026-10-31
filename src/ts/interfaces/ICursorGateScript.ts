/** The gate stamps its lifetime signal on the classic engine script before
    setting `src`; boot.ts reads it back off `document.currentScript`. */
export interface ICursorGateScript extends HTMLScriptElement {
  __artsCursorSignal?: AbortSignal
}
