/** Keep Chromium's input/accessibility in its original window. Only pixels are
 * presented by Metal, so Steam has a native drawable to composite its overlay. */
export function attachSteamPresentation(window, native, { fps = 30, platform = process.platform } = {}) {
  if (platform !== 'darwin' || !native?.metalAttach) return () => {}
  let stopped = false
  let capturing = false
  let timer
  const stop = () => {
    if (stopped) return
    stopped = true
    clearInterval(timer)
    try { native.metalDetach() } catch { /* Account change or shutdown. */ }
  }
  try { native.metalAttach(window.getNativeWindowHandle()) }
  catch (error) { console.warn('Steam presentation unavailable:', error.message); return stop }
  const capture = async () => {
    if (stopped || capturing || window.isDestroyed()) return
    const paused = !window.isVisible() || window.isMinimized()
    try { native.metalPaused(paused) } catch { stop(); return }
    if (paused) return
    capturing = true
    try {
      const image = await window.webContents.capturePage()
      if (stopped || window.isDestroyed() || image.isEmpty()) return
      const { width, height } = image.getSize()
      native.metalFrame(image.toBitmap(), width, height)
    } catch (error) {
      console.warn('Steam presentation stopped:', error.message)
      stop()
    } finally { capturing = false }
  }
  timer = setInterval(() => { void capture() }, 1000 / fps)
  timer.unref()
  window.once('closed', stop)
  void capture()
  return stop
}
