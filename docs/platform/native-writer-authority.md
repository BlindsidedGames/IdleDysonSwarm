# Native writer authority

Writer authority and save storage are separate ports. Browser tabs use
`BrowserExpiringWriterAuthority`, the existing renewable 15-second IndexedDB
lease with heartbeat, expiry, deliberate takeover and cross-tab notices. Its
expiry is required for crashed-tab recovery and remains browser-only.

Capacitor and Electron use `SingleHostSessionWriterAuthority`. It fences one
terminal renderer session by session ID and generation, but has no wall-clock
deadline, heartbeat or takeover. Suspending a WebView or renderer therefore
cannot revoke its authority merely because JavaScript timers did not run.
Release and shutdown still cancel synchronously, reject results that settle
after cancellation, validate before and after admitted operations, drain
serialized in-flight work, and close the session permanently. Save publication
continues to use the host filesystem bridge's verified temporary write and
atomic replacement.

## Current single-renderer invariant

This native authority is valid because each supported package owns at most one
gameplay renderer at a time:

- Android declares the gameplay Activity as `singleTask`.
- iOS sets `UIApplicationSupportsMultipleScenes` to `false`.
- Electron takes a process single-instance lock and creates one gameplay
  `BrowserWindow`; activation creates a new one only after the previous window
  has closed.

Native multi-window support would require authority in the host process and is
not implemented speculatively. If any host enables multiple simultaneous
gameplay renderers, this invariant must be replaced before release.

## Lifecycle and startup

The Capacitor bridge registers `lifecycleChanged` before querying
`currentLifecycle`. An event epoch prevents a delayed current-state response
from overwriting a newer event. Until either source proves the WebView active,
the bridge remains conservatively backgrounded rather than beginning
optimistically active. Lifecycle reconciliation is adjacent hardening; it is
not the cause of the former 15-second ownership loss.

Runtime admission separately passes its already sampled startup phase into the
authority router. The router subscribes first, buffers receipt-time lifecycle
observations, and then reconciles `currentPhase`. A callback epoch prevents a
stale query result from overwriting an event received during reconciliation.
The seeded startup replay remains first in the serialized authority lane,
followed by any buffered phases in receipt order; an unchanged current phase is
not replayed as a duplicate canonical transition.

Capacitor holds the native splash until the first branded React presentation
is committed: normally the in-app loader, or gameplay itself on an already
ready warm start. The earliest HTML, Android/iOS splash assets and Electron
window use the same dark launch background. Runtime/save initialization then
continues behind the lightweight accessible loader, which adds friendly
delayed status after a slow start and yields directly to gameplay. The
diagnostic/recovery shell is shown only when startup is genuinely blocked or
fails.
