/** PHP-printed boot config the gate reads (`window.artsCursorFollowerBoot`):
    filemtime-versioned asset URLs plus the editor-preview flag that switches
    the gate from lazy (first pointer signal) to immediate. */
export type TGateBoot = {
  js: string
  css: string
  editor: boolean
}
