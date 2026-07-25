/*
 * Purpose: Owns runtime clipboard export/import and the in-game read-only recovery-copy control.
 * Runs: Runtime Oracle inspector/UI callbacks, with editor-only refresh for debug exports.
 * Primary entry points: LoadFromClipboard, SaveToClipboard, ExportSaveDebugJson, and AttemptSaveRecovery.
 * Owns: Clipboard interaction, local entitlement merge policy, and player-facing recovery-copy feedback.
 * Delegates: All import/recovery preparation and writes to SaveRecoveryImportCoordinator/CanonicalSaveStore.
 *
 * Interacts with:
 * - Assets/Scenes/Game.unity clipboard confirmation and recovery button bindings.
 * - Assets/Scripts/Systems/Save/SaveRecoveryImportCoordinator.cs.
 * - Assets/Scripts/Systems/Save/LegacySaveCandidateAdapter.cs.
 * - Assets/Scripts/Expansion/Oracle.RuntimeSeams.cs.
 *
 * Change notes:
 * - LoadFromClipboard is a serialized scene callback; renaming or changing its signature breaks Game.unity.
 * - Imported state must be transactionally committed before scene reload and must never retain historical offline time.
 * - Recovery copies are prepared read-only and canonicalized to uppercase IDB1 without changing source artifacts.
 * - Clipboard export field/save-key changes require matching migration and fixture coverage.
 */

using System;
using System.IO;
using System.Text;
using Sirenix.OdinInspector;
using Sirenix.Serialization;
using SirenixSerializationUtility = Sirenix.Serialization.SerializationUtility;
using Systems.Save;
using UnityEngine;
using UnityEngine.SceneManagement;
using static LoadScreenMethods;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace Expansion
{
    /// <summary>
    /// Clipboard import/export entrypoints for <see cref="Oracle"/>.
    /// </summary>
    /// <remarks>
    /// Runtime.
    /// <para>Primary entry points: <see cref="LoadFromClipboard"/>, <see cref="SaveToClipboard"/>,
    /// <see cref="ExportSaveDebugJson"/>, <see cref="AttemptSaveRecovery"/>.</para>
    /// High-level save system map:
    /// <para>Canonical codec: <see cref="SaveCodec"/> (prefix <c>IDB1:</c>).</para>
    /// <para>Snapshot compaction: <see cref="SaveSnapshotBuilder"/>.</para>
    /// <para>On-disk canonical string: <see cref="SaveSystem"/> + <see cref="OdinStringFileStorage"/>.</para>
    /// <para>Legacy ES3 import/recovery: <see cref="LegacyEs3Save"/>.</para>
    /// <para>Legacy candidate selection: <see cref="SaveLoadCandidateSelector"/>.</para>
    /// <para>Implementation log: <c>Documentation/SaveSystemV11ImplementationLog.md</c>.</para>
    /// <para>Change notes: skill point reconciliation is intentionally manual (see <c>Assets/Scripts/Expansion/Oracle.SkillPoints.cs</c>)
    /// and is not run automatically as part of clipboard import.</para>
    /// </remarks>
    public partial class Oracle
    {
        [TabGroup("SaveData", "Buttons")] public bool beta;

        /// <summary>
        /// Enables local developer options while preserving the external debug entitlement.
        /// </summary>
        [TabGroup("SaveData", "Buttons"), Button("Unlock Dev Options (Testing)")]
        public void UnlockDevOptionsForTesting()
        {
            if (saveSettings == null) saveSettings = new SaveDataSettings();

            PlayerEntitlementsStore.DebugEntitlementPurchased = true;
            saveSettings.debugOptions = true;
            saveSettings.debugEverEnabled = true;
            if (lsm != null) lsm.SetDebug();
            NotifyDebugOptionsChanged();

            Debug.Log("Dev options unlocked for testing.");
        }

        /// <summary>
        /// Imports the current clipboard only after preparation and verified canonical replacement, then reloads startup.
        /// </summary>
        [TabGroup("SaveData", "Buttons"), Button]
        public void LoadFromClipboard()
        {
            if (!TryGetSaveRecoveryImportCoordinator(
                    out SaveRecoveryImportCoordinator coordinator,
                    out _,
                    out string storeError))
            {
                Debug.LogError($"LoadFromClipboard could not access prepared save storage. {storeError}");
                return;
            }

            bool previousDevOptions = saveSettings != null && saveSettings.debugOptions;
            bool previousDoubleIp = saveSettings != null && saveSettings.doubleIp;
            bool doubleIpPrefUnlocked = PlayerPrefs.GetInt("doubleip", 0) == 1;
            string clipboard = GUIUtility.systemCopyBuffer;
            if (!coordinator.TryImportText(
                    clipboard,
                    allowCanonicalOverwrite: true,
                    imported =>
                    {
                        imported.debugOptions = imported.debugOptions || previousDevOptions;
                        imported.doubleIp =
                            imported.doubleIp || previousDoubleIp || doubleIpPrefUnlocked;
                        if (imported.debugOptions)
                        {
                            imported.debugEverEnabled = true;
                        }
                    },
                    out _,
                    out SaveDataSettings committed,
                    out string importError))
            {
                Debug.LogError($"LoadFromClipboard rejected the save without changing state. {importError}");
                return;
            }

            if (committed.doubleIp)
            {
                PlayerPrefs.SetInt("doubleip", 1);
            }

            if (committed.debugOptions)
            {
                PlayerEntitlementsStore.DebugEntitlementPurchased = true;
            }

            _canonicalWriteBlockedByUnpreparedArtifact = false;
            SceneManager.LoadScene(0);
        }

        /// <summary>
        /// Copies a compact save snapshot using JSON developer output or canonical uppercase IDB1 player output.
        /// </summary>
        [TabGroup("SaveData", "Buttons"), Button]
        public void SaveToClipboard()
        {
            SaveDictionaries();
            byte[] fullBytes = SirenixSerializationUtility.SerializeValue(saveSettings, DataFormat.JSON);
            SaveDataSettings snapshot = SaveSnapshotBuilder.CreateSaveSnapshotForStorage(
                saveSettings,
                includeBase64Fields: false,
                buildOwnedBitsetFromRuntime: BuildOwnedBitsetFromRuntime,
                getAutoAssignmentSkillIds: GetAutoAssignmentSkillIds);
            if (beta)
            {
                byte[] bytes = SirenixSerializationUtility.SerializeValue(snapshot, DataFormat.JSON);
                string compactJson = Encoding.UTF8.GetString(bytes);
                GUIUtility.systemCopyBuffer = compactJson;
                string fullClipboardJson = Encoding.UTF8.GetString(fullBytes);
                Debug.Log(
                    $"SaveToClipboard size: {fullBytes.Length} -> {bytes.Length} bytes (raw JSON), " +
                    $"{fullClipboardJson.Length} -> {compactJson.Length} chars (clipboard).");
                return;
            }

            byte[] binaryBytes = SirenixSerializationUtility.SerializeValue(snapshot, DataFormat.Binary);
            string compactClipboard = SaveCodec.EncodeBinary(binaryBytes, compress: true);
            GUIUtility.systemCopyBuffer = compactClipboard;
            string fullClipboardBinary = SaveCodec.EncodeBinary(SirenixSerializationUtility.SerializeValue(saveSettings, DataFormat.Binary),
                compress: true);
            Debug.Log(
                $"SaveToClipboard size: {fullBytes.Length} -> {binaryBytes.Length} bytes (binary), " +
                $"{fullClipboardBinary.Length} -> {compactClipboard.Length} chars (clipboard).");
        }

        /// <summary>
        /// Writes a support-oriented debug DTO beneath the project or persistent-data debug folder.
        /// </summary>
        [TabGroup("SaveData", "Buttons"), Button]
        public void ExportSaveDebugJson()
        {
            SaveDictionaries();
            byte[] fullBytes = SirenixSerializationUtility.SerializeValue(saveSettings, DataFormat.JSON);
            SaveDataSettings snapshot = SaveSnapshotBuilder.CreateSaveSnapshotForStorage(
                saveSettings,
                includeBase64Fields: false,
                buildOwnedBitsetFromRuntime: BuildOwnedBitsetFromRuntime,
                getAutoAssignmentSkillIds: GetAutoAssignmentSkillIds);
            byte[] bytes = SirenixSerializationUtility.SerializeValue(snapshot, DataFormat.Binary);
            byte[] compressed = SaveCodec.CompressBytes(bytes);
            var dto = new ExportSaveDto
            {
                version = CurrentSaveVersion,
                format = "binary+gzip+base64",
                rawBytes = bytes.Length,
                compressedBytes = compressed.Length,
                data = Convert.ToBase64String(compressed)
            };
            string json = JsonUtility.ToJson(dto);

            string folderPath = GetSaveDebugFolderPath();
            Directory.CreateDirectory(folderPath);
            string filePath = Path.Combine(folderPath, $"save-debug-{DateTime.UtcNow:yyyyMMdd-HHmmss}.json");
            File.WriteAllText(filePath, json, Encoding.UTF8);

            Debug.Log($"Save debug JSON written to: {filePath}");
            string debugFullClipboard = beta ? Encoding.UTF8.GetString(fullBytes) : SaveCodec.EncodeBinary(fullBytes, compress: true);
            string debugCompactClipboard = beta ? json : SaveCodec.EncodeBinary(bytes, compress: true);
            Debug.Log(
                $"ExportSaveDebugJson size: {fullBytes.Length} -> {bytes.Length} bytes (raw JSON), " +
                $"{debugFullClipboard.Length} -> {debugCompactClipboard.Length} chars (clipboard).");
#if UNITY_EDITOR
            AssetDatabase.Refresh();
#endif
        }

        /// <summary>
        /// Copies the first deterministically discovered valid recovery candidate as canonical uppercase IDB1 text.
        /// </summary>
        public void AttemptSaveRecovery()
        {
            if (!TryGetSaveRecoveryImportCoordinator(
                    out SaveRecoveryImportCoordinator coordinator,
                    out CanonicalSaveStore store,
                    out string storeError))
            {
                recoveryText.text = "Recovery Unavailable";
                Debug.LogError($"[SaveRecovery] Recovery copy unavailable. {storeError}");
                return;
            }

            string legacyOdinPath = Path.Combine(Application.persistentDataPath, fileName + ".idsOdin");
            var explicitLegacy = LegacySaveCandidateAdapter.Discover(legacyOdinPath);
            foreach (SaveStorageCandidate candidate in store.DiscoverCandidates(explicitLegacy))
            {
                if (!coordinator.TryPrepareCandidate(
                        candidate,
                        out PreparedSaveResult prepared,
                        out string prepareError))
                {
                    Debug.LogWarning(
                        $"[SaveRecovery] Skipped non-publishable recovery candidate '{candidate.Path}'. {prepareError}");
                    continue;
                }

                GUIUtility.systemCopyBuffer = prepared.CanonicalText;
                recoveryText.text = "Save Copied";
                Debug.Log(
                    $"[SaveRecovery] Copied prepared {candidate.Source} candidate to clipboard without changing storage.");
                return;
            }

            recoveryText.text = "No Valid Save Found";
            Debug.LogWarning("[SaveRecovery] No discovered save artifact passed preparation for recovery copy.");
        }

        /// <summary>
        /// Resolves the platform-appropriate debug export folder.
        /// </summary>
        /// <returns>The absolute debug export folder.</returns>
        private string GetSaveDebugFolderPath()
        {
#if UNITY_EDITOR
            string projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            return Path.Combine(projectRoot, "Documentation", "savedebugging");
#else
            return Path.Combine(Application.persistentDataPath, "savedebugging");
#endif
        }

        /// <summary>
        /// Resolves the Oracle runtime store as the prepared transactional implementation required by recovery imports.
        /// </summary>
        /// <param name="coordinator">The shared Stage 4 recovery import coordinator.</param>
        /// <param name="store">The prepared transactional canonical store.</param>
        /// <param name="error">The unavailable-store error.</param>
        /// <returns><see langword="true"/> when the runtime store supports prepared recovery operations.</returns>
        private bool TryGetSaveRecoveryImportCoordinator(
            out SaveRecoveryImportCoordinator coordinator,
            out CanonicalSaveStore store,
            out string error)
        {
            EnsureRuntimeSeamsInitialized();
            store = _saveStore as CanonicalSaveStore;
            if (store == null)
            {
                coordinator = null;
                error = "The configured save store does not expose prepared transactional recovery operations.";
                return false;
            }

            coordinator = new SaveRecoveryImportCoordinator(store, () => _clock.UtcNow);
            error = null;
            return true;
        }
    }
}
