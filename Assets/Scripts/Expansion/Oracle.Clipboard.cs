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
    /// High-level save system map:
    /// <para>Canonical codec: <see cref="SaveCodec"/> (prefix <c>IDB1:</c>).</para>
    /// <para>Snapshot compaction: <see cref="SaveSnapshotBuilder"/>.</para>
    /// <para>On-disk canonical string: <see cref="SaveSystem"/> + <see cref="OdinStringFileStorage"/>.</para>
    /// <para>Legacy ES3 import/recovery: <see cref="LegacyEs3Save"/>.</para>
    /// <para>Legacy candidate selection: <see cref="SaveLoadCandidateSelector"/>.</para>
    /// <para>Implementation log: <c>Documentation/SaveSystemV11ImplementationLog.md</c>.</para>
    /// </remarks>
    public partial class Oracle
    {
        [TabGroup("SaveData", "Buttons")] public bool beta;

        [TabGroup("SaveData", "Buttons"), Button("Unlock Dev Options (Testing)")]
        public void UnlockDevOptionsForTesting()
        {
            if (saveSettings == null) saveSettings = new SaveDataSettings();

            saveSettings.debugOptions = true;
            PlayerPrefs.SetInt("debug", 1);
            PlayerPrefs.Save();
            if (lsm != null) lsm.SetDebug();
            NotifyDebugOptionsChanged();

            Debug.Log("Dev options unlocked for testing.");
        }

        [TabGroup("SaveData", "Buttons"), Button]
        public void LoadFromClipboard()
        {
            bool previousDevOptions = saveSettings != null && saveSettings.debugOptions;
            bool previousDoubleIp = saveSettings != null && saveSettings.doubleIp;
            bool debugPrefUnlocked = PlayerPrefs.GetInt("debug", 0) == 1;
            bool doubleIpPrefUnlocked = PlayerPrefs.GetInt("doubleip", 0) == 1;
            string clipboard = GUIUtility.systemCopyBuffer;
            if (!SaveCodec.TryDecodeSaveSettings(clipboard, out SaveDataSettings decoded))
            {
                Debug.LogError("LoadFromClipboard failed to decode save data. Clipboard format not recognized.");
                return;
            }

            saveSettings = decoded;

            LoadDictionaries();
            if (!oracle.saveSettings.cheater && saveSettings.maxOfflineTime < 86400)
                oracle.saveSettings.maxOfflineTime = 86400;
            saveSettings.debugOptions = saveSettings.debugOptions || previousDevOptions || debugPrefUnlocked;
            saveSettings.doubleIp = saveSettings.doubleIp || previousDoubleIp || doubleIpPrefUnlocked;
            if (saveSettings.debugOptions) PlayerPrefs.SetInt("debug", 1);
            if (saveSettings.doubleIp) PlayerPrefs.SetInt("doubleip", 1);
            NotifyDebugOptionsChanged();
            FixSkillpoints();
            ApplyMigrations();
            SyncAutoAssignFromSelectedPreset(runAutoAssign: false);
            LogPresetAutoAssignState("PostMigration/Clipboard");
            SaveInternal(true, updateQuitTime: false);
            SceneManager.LoadScene(0);
        }

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

        public void AttemptSaveRecovery()
        {
            string canonicalPath = SavePaths.GetCanonicalSavePath();
            if (File.Exists(canonicalPath))
            {
                string text = File.ReadAllText(canonicalPath, Encoding.UTF8);
                GUIUtility.systemCopyBuffer = text;
                recoveryText.text = "Save Copied";
                Debug.Log("Copied canonical save to clipboard");
                return;
            }

            string legacyOdinPath = Path.Combine(Application.persistentDataPath, fileName + ".idsOdin");
            if (File.Exists(legacyOdinPath))
            {
                byte[] bytes = File.ReadAllBytes(legacyOdinPath);
                Debug.Log("Copied to clipboard");

                GUIUtility.systemCopyBuffer = beta ? Encoding.UTF8.GetString(bytes) : Convert.ToBase64String(bytes);
                recoveryText.text = "Save Copied";
            }
        }

        private string GetSaveDebugFolderPath()
        {
#if UNITY_EDITOR
            string projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            return Path.Combine(projectRoot, "Documentation", "savedebugging");
#else
            return Path.Combine(Application.persistentDataPath, "savedebugging");
#endif
        }
    }
}
