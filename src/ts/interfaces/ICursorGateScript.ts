/** Classic scripts capture their gate lifetime before the browser starts fetching. */
export interface ICursorGateScript extends HTMLScriptElement {
  __artsCursorSignal?: AbortSignal
}
