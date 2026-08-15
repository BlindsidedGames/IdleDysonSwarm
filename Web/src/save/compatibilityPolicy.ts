/**
 * Product save compatibility is intentionally one-way.
 *
 * Public Unity saves remain supported import sources. The active Web runtime
 * owns schema 13 and may write it to player storage, but it does not encode a
 * Unity-readable IDB1 graph or synchronize changes back to Unity.
 */
export const SAVE_COMPATIBILITY_POLICY = Object.freeze({
  legacyUnityImportSupported: true,
  webSchema13PlayerWritesSupported: true,
  unityReadableExportSupported: false,
  twoWayUnitySynchronizationSupported: false,
})
