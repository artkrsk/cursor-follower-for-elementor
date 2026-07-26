import type { ICursorSession } from '@engine'

let session: ICursorSession | null = null

export function toggleLoading(): void {
  if (session) {
    session.release()
    session = null
    return
  }
  session = window.artsCursor?.get()?.loading() ?? null
}
