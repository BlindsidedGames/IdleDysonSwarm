using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Classes;
using GameData;
using Sirenix.Serialization;
using SirenixSerializationUtility = Sirenix.Serialization.SerializationUtility;
using Systems.Save;
using Systems.Skills;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Expansion
{
    /// <summary>
    /// Disk persistence and legacy load selection for <see cref="Oracle"/>.
    /// </summary>
    /// <remarks>
    /// Runtime.
    /// <para>Primary entry points: <see cref="Load"/>, <see cref="WipeAllData"/>, <see cref="LoadState"/>.</para>
    /// <para>Owns: startup load-source selection and wipe orchestration.</para>
    /// <para>Diagnostics: writes one tagged warning per save lifecycle event plus offline-time replay data via
    /// <see cref="AwayForSeconds"/>.</para>
    /// <para>Delegates: ES3 artifact probing to <see cref="LegacyEs3Save"/>, codec/storage to
    /// <see cref="SaveCodec"/>/<see cref="SaveSystem"/>.</para>
    /// Canonical persistence stores the exact same save string used by clipboard export/import (prefix <c>IDB1:</c>).
    /// <para>Codec: <see cref="SaveCodec"/>.</para>
    /// <para>Snapshot compaction: <see cref="SaveSnapshotBuilder"/>.</para>
    /// <para>Persistence orchestration: <see cref="SaveSystem"/> + <see cref="OdinStringFileStorage"/>.</para>
    /// <para>Interacts with:
    /// callers include Unity lifecycle via <c>Oracle.Start()</c> and debug UI buttons; callees include
    /// <see cref="SaveLoadCandidateSelector"/>, <see cref="LegacyEs3Save"/>, and migration routines in
    /// <c>Assets/Scripts/Expansion/Oracle.Migrations.cs</c>.</para>
    /// <para>Change notes:
    /// changing legacy keys/paths (<c>saveSettings</c>, <c>.idsOdin</c>, canonical file path) can strand old saves;
    /// loading/importing a save does not automatically reconcile skill points (manual tool in
    /// <c>Assets/Scripts/Expansion/Oracle.SkillPoints.cs</c>).</para>
    /// </remarks>
    public partial class Oracle
    {
        private void SaveInternal(bool force, bool updateQuitTime = false)
        {
            if (!_isSaveReady && !force)
            {
                if (updateQuitTime)
                {
                    Debug.LogWarning(
                        $"[OfflineTimeDiag] SaveInternalBlocked | phase=SaveInternal, reason=not_ready, platform={Application.platform}, " +
                        $"ready={_isSaveReady.ToString().ToLowerInvariant()}, loaded={Loaded.ToString().ToLowerInvariant()}, " +
                        $"dateQuitBefore='{FormatDebugString(saveSettings?.dateQuitString)}'");
                }
                return;
            }
            string dateSource = "none";
            if (updateQuitTime)
            {
                dateSource = "updated";
                SetDateQuitString(DateTime.UtcNow.ToString(CultureInfo.InvariantCulture), isQuitTimestamp: true);
            }

            bool saved = TrySaveState(out string saveError);
            string status = saved ? "ok" : "failed";
            string details = $"phase=SaveInternal, platform={Application.platform}, force={force.ToString().ToLowerInvariant()}, dateSource={dateSource}, " +
                             $"saveResult={status}, path='{SavePaths.GetCanonicalSavePath()}', quit={FormatDebugString(saveSettings.dateQuitString)}, " +
                             $"offlineTime={saveSettings.offlineTime.ToString(CultureInfo.InvariantCulture)}, " +
                             $"maxOfflineTime={saveSettings.maxOfflineTime.ToString(CultureInfo.InvariantCulture)}, " +
                             $"loaded={Loaded.ToString().ToLowerInvariant()}, ready={_isSaveReady.ToString().ToLowerInvariant()}";
            if (!string.IsNullOrWhiteSpace(saveError))
            {
                details += $", error={FormatDebugString(saveError)}";
            }

            Debug.LogWarning($"[OfflineTimeDiag] {details}");
            if (!saved) return;
        }

        private static void DeleteDefaultEs3SaveArtifacts()
        {
            LegacyEs3Save.DeleteDefaultArtifacts();
        }

        private static void TryDeleteFile(string path)
        {
            try
            {
                if (File.Exists(path)) File.Delete(path);
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[SaveRecovery] Failed deleting '{path}': {e.Message}");
            }
        }

        private static void ArchiveDefaultEs3SaveArtifacts(string reason)
        {
            LegacyEs3Save.ArchiveDefaultArtifacts(reason);
        }

        private static bool TryRecoverDefaultEs3Save(out SaveDataSettings recovered, out string recoveredFromPath)
        {
            return LegacyEs3Save.TryRecoverDefaultSave(out recovered, out recoveredFromPath);
        }

        /// <summary>
        /// Hard wipe: deletes the run save and clears debug entitlement.
        /// </summary>
        public void WipeAllData()
        {
            PlayerEntitlementsStore.ClearDebugEntitlement();
            WipeAllDataInternal(enableDebugAfterWipe: false);
        }

        /// <summary>
        /// Soft wipe: deletes the run save but preserves debug entitlement. Debug is re-enabled after wipe if entitled.
        /// </summary>
        public void WipeAllDataKeepDebugEntitlement()
        {
            bool entitled = PlayerEntitlementsStore.DebugEntitlementPurchased;
            WipeAllDataInternal(enableDebugAfterWipe: entitled);
        }

        private void WipeAllDataInternal(bool enableDebugAfterWipe)
        {
            bool doubleIpUnlocked = (saveSettings != null && saveSettings.doubleIp) || PlayerPrefs.GetInt("doubleip", 0) == 1;
            DeleteDefaultEs3SaveArtifacts();

            // Also delete the canonical Odin-only save file + backups so the wipe is complete.
            TryDeleteFile(SavePaths.GetCanonicalSavePath());
            TryDeleteFile(Path.Combine(Application.persistentDataPath, fileName + ".idsOdin"));
            try
            {
                string backupFolder = SavePaths.GetBackupFolderPath();
                if (Directory.Exists(backupFolder))
                {
                    Directory.Delete(backupFolder, recursive: true);
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[SaveRecovery] Failed deleting save backups: {e.Message}");
            }

            saveSettings = new SaveDataSettings();
            saveSettings.debugOptions = enableDebugAfterWipe;
            saveSettings.debugEverEnabled = enableDebugAfterWipe;
            saveSettings.doubleIp = doubleIpUnlocked;
            saveSettings.saveVersion = CurrentSaveVersion;
            NotifyDebugOptionsChanged();
            SaveInternal(force: true, updateQuitTime: false);
            SceneManager.LoadScene(0);
        }

        [ContextMenu("WipeSaveData")]
        public void WipeSaveData()
        {
            bool previousDebugEnabled = saveSettings != null && saveSettings.debugOptions;
            bool doubleIpUnlocked = (saveSettings != null && saveSettings.doubleIp) || PlayerPrefs.GetInt("doubleip", 0) == 1;
            foreach (KeyValuePair<int, SkillTreeItem> var in SkillTree) var.Value.Owned = false;
            saveSettings = new SaveDataSettings
            {
                saveData = new SaveData(),
                dysonVerseSaveData = new DysonVerseSaveData
                {
                    dysonVerseInfinityData = new DysonVerseInfinityData(),
                    dysonVersePrestigeData = new DysonVersePrestigeData(),
                    dysonVerseSkillTreeData = new DysonVerseSkillTreeData()
                },
                sdPrestige = new SaveDataPrestige(),
                sdSimulation = new SaveDataDream1(),
                prestigePlus = new PrestigePlus()
            };
            if (Loaded)
                saveSettings.firstReality = true;
            // Preserve current debug enabled state, but do not re-enable based on legacy prefs.
            // Debug entitlement is stored outside the save; debug enable/disable is per-save.
            saveSettings.debugOptions = previousDebugEnabled;
            if (saveSettings.debugOptions)
            {
                saveSettings.debugEverEnabled = true;
                PlayerEntitlementsStore.DebugEntitlementPurchased = true;
            }
            saveSettings.doubleIp = doubleIpUnlocked;
            saveSettings.saveVersion = CurrentSaveVersion;
            NotifyDebugOptionsChanged();
        }

        [ContextMenu("WipeDream1Save")]
        public void WipeDream1Save()
        {
            saveSettings.sdSimulation = new SaveDataDream1();
        }

        [ContextMenu("Save")]
        public void Save()
        {
            SaveInternal(false, updateQuitTime: false);
        }

        public void SaveForQuit()
        {
            SaveInternal(force: true, updateQuitTime: true);
        }

        private void SetDateQuitString(string value, bool isQuitTimestamp = false)
        {
            if (!isQuitTimestamp || saveSettings == null) return;
            saveSettings.dateQuitString = value;
        }

        public bool TrySaveState(out string error)
        {
            error = null;
            SaveDictionaries();
            PackSettingsFlags();
            SaveDataSettings snapshot = SaveSnapshotBuilder.CreateSaveSnapshotForStorage(
                saveSettings,
                includeBase64Fields: false,
                buildOwnedBitsetFromRuntime: BuildOwnedBitsetFromRuntime,
                getAutoAssignmentSkillIds: GetAutoAssignmentSkillIds);

            SaveSystem saveSystem = SaveSystem.CreateDefault();
            if (!saveSystem.TrySave(snapshot, out _, out string saveError))
            {
                error = saveError;
                Debug.LogError($"[Save] Failed writing canonical save file: {error}");
                return false;
            }

            return true;
        }

        public void SaveState()
        {
            TrySaveState(out string _);
        }

        private byte[] BuildOwnedBitsetFromRuntime()
        {
            byte[] bits = SkillBitsetUtility.CreateEmptyBitset();

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry != null && registry.skillDatabase != null && registry.skillDatabase.skills.Count > 0)
            {
                foreach (SkillDefinition skill in registry.skillDatabase.skills)
                {
                    if (skill == null || string.IsNullOrEmpty(skill.id)) continue;
                    if (!IsSkillOwned(skill.id)) continue;
                    if (SkillBitsetUtility.TryGetIndex(skill.id, out int index))
                    {
                        SkillBitsetUtility.SetBit(bits, index, true);
                    }
                }
            }

            return bits;
        }

        private void ApplyLoadedSettings(SaveDataSettings loaded, string sourceLog)
        {
            saveSettings = loaded;
            LoadDictionaries();
            if (!oracle.saveSettings.cheater && oracle.saveSettings.maxOfflineTime < 86400)
                oracle.saveSettings.maxOfflineTime = 86400;
            saveSettings.lastSuccessfulLoadUtc = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
            Loaded = true;
            Debug.Log($"Loaded with {sourceLog}");
        }

        public void Load()
        {
            Loaded = false;
            SetSaveReady(false);
            WipeSaveData();

            // Canonical on-disk save: text file containing the exact clipboard string (IDB1:...).
            // This path is intended to replace ES3 as the primary persistence mechanism, while ES3 remains
            // as a legacy import/fallback during the transition period.
            bool loadedFromCanonical = false;
            SaveSystem saveSystem = SaveSystem.CreateDefault();
            if (saveSystem.Storage.Exists())
            {
                if (saveSystem.TryLoad(out SaveDataSettings canonicalLoaded, out string canonicalError))
                {
                    loadedFromCanonical = true;
                    ApplyLoadedSettings(canonicalLoaded, "canonical save file");
                }
                else
                {
                    Debug.LogError($"[SaveRecovery] Canonical save load failed; falling back to ES3. {canonicalError}");
                }
            }

            if (!Loaded)
            {
                SaveLoadCandidate best = default;

                bool es3Broken = false;
                try
                {
                    if (ES3.KeyExists("saveSettings"))
                    {
                        try
                        {
                            SaveDataSettings es3Loaded = ES3.Load<SaveDataSettings>("saveSettings");
                            SaveLoadCandidate candidate = new SaveLoadCandidate(SaveLoadSource.Es3, es3Loaded);
                            if (SaveLoadCandidateSelector.IsBetterCandidate(candidate, best)) best = candidate;
                        }
                        catch (Exception e)
                        {
                            Debug.LogError($"[SaveRecovery] ES3.Load failed; will attempt recovery. {e}");
                            es3Broken = true;
                        }
                    }
                }
                catch (Exception e)
                {
                    Debug.LogError($"[SaveRecovery] ES3.KeyExists failed; will attempt recovery. {e}");
                    es3Broken = true;
                }

                // Attempt ES3 artifact recovery even if the main load succeeded. If the main ES3 load
                // silently returned defaults, the backup often still contains the last good save.
                if (TryRecoverDefaultEs3Save(out SaveDataSettings recovered, out string recoveredFrom))
                {
                    SaveLoadCandidate recoveredCandidate =
                        new SaveLoadCandidate(SaveLoadSource.Es3Recovered, recovered, recoveredFrom);
                    if (SaveLoadCandidateSelector.IsBetterCandidate(recoveredCandidate, best)) best = recoveredCandidate;
                }

                // Legacy Odin JSON file (pre-canonical / pre-ES3 deprecation).
                string legacyOdinPath = Path.Combine(Application.persistentDataPath, fileName + ".idsOdin");
                if (SaveLoadCandidateSelector.TryLoadLegacyOdinJsonSave(legacyOdinPath, out SaveDataSettings legacyOdin,
                        out string odinError))
                {
                    SaveLoadCandidate legacyCandidate =
                        new SaveLoadCandidate(SaveLoadSource.LegacyOdinJson, legacyOdin, legacyOdinPath);
                    if (SaveLoadCandidateSelector.IsBetterCandidate(legacyCandidate, best)) best = legacyCandidate;
                }
                else if (!string.IsNullOrEmpty(odinError) && File.Exists(legacyOdinPath))
                {
                    Debug.LogWarning(
                        $"[SaveRecovery] Failed loading legacy Odin JSON save '{legacyOdinPath}': {odinError}");
                }

                if (best.Settings != null)
                {
                    switch (best.Source)
                    {
                        case SaveLoadSource.Es3Recovered:
                            Debug.LogWarning(
                                $"[SaveRecovery] Loaded best candidate from ES3 artifacts '{best.DebugPath}'.");
                            ApplyLoadedSettings(best.Settings, "ES3 (recovered)");
                            break;
                        case SaveLoadSource.LegacyOdinJson:
                            ApplyLoadedSettings(best.Settings, "Odin (legacy JSON)");
                            break;
                        default:
                            ApplyLoadedSettings(best.Settings, "ES3");
                            break;
                    }
                }
                else if (es3Broken)
                {
                    // No recoverable ES3 backup found. Preserve the broken file for support/debugging,
                    // then allow the rest of the normal load flow to continue (new save).
                    ArchiveDefaultEs3SaveArtifacts("unrecoverable");
                }
            }

            if (!Loaded)
            {
                saveSettings.dateStarted = DateTime.UtcNow.ToString(CultureInfo.InvariantCulture);
                Loaded = true;
                Debug.Log("Made new save");
            }

            ApplyMigrations();
            SyncAutoAssignFromSelectedPreset(runAutoAssign: true);
            UpdateSkills?.Invoke();
            StartCoroutine(AwayForCoroutine());
            SetSaveReady(true);

            // If we loaded from a legacy source (ES3 or old .idsOdin), immediately write the canonical file so
            // future launches use the Odin-only pipeline.
            if (!loadedFromCanonical)
            {
                try
                {
                    SaveInternal(force: true, updateQuitTime: false);
                }
                catch (Exception e)
                {
                    Debug.LogWarning($"[Save] Failed writing canonical save after legacy load: {e.Message}");
                }
            }
        }

        public void LoadState(string filePath)
        {
            if (!File.Exists(filePath)) return;

            byte[] bytes = File.ReadAllBytes(filePath);
            saveSettings = SirenixSerializationUtility.DeserializeValue<SaveDataSettings>(bytes, DataFormat.JSON);
            LoadDictionaries();
            if (!oracle.saveSettings.cheater && oracle.saveSettings.maxOfflineTime < 86400)
                oracle.saveSettings.maxOfflineTime = 86400;
            Loaded = true;
        }

        public static event Action<double> AwayFor;

        private IEnumerator AwayForCoroutine()
        {
            yield return new WaitForSeconds(.1f);
            AwayForSeconds();
        }

        private void AwayForSeconds()
        {
            if (string.IsNullOrEmpty(oracle.saveSettings.dateQuitString))
            {
                Debug.LogWarning($"[OfflineTimeDiag] AwayForSeconds | platform={Application.platform}, dateQuitString_missing=true");
                return;
            }
            DateTime dateStarted;
            string dateSource = "quitString";
            if (!DateTime.TryParse(oracle.saveSettings.dateQuitString, CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out dateStarted))
            {
                dateSource = "dateStartedFallback";
                if (!DateTime.TryParse(oracle.saveSettings.dateStarted, CultureInfo.InvariantCulture,
                        DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out dateStarted))
                {
                    dateSource = "runtimeUtcFallback";
                    dateStarted = DateTime.UtcNow;
                }
            }

            DateTime dateNow = DateTime.UtcNow;
            TimeSpan timespan = dateNow - dateStarted;
            float seconds = (float)timespan.TotalSeconds;
            float clampedSeconds = Math.Max(0, seconds);
            Debug.LogWarning(
                "[OfflineTimeDiag] AwayForSeconds | " +
                    $"platform={Application.platform}, " +
                    $"dateSource={dateSource}, " +
                $"dateQuit='{FormatDebugString(oracle.saveSettings.dateQuitString)}', " +
                $"dateStarted='{FormatDebugString(oracle.saveSettings.dateStarted)}', " +
                $"resolvedStart='{FormatUtc(dateStarted)}', now='{FormatUtc(dateNow)}', " +
                $"awayRawSeconds={seconds.ToString("F3", CultureInfo.InvariantCulture)}, " +
                $"awayClampedSeconds={clampedSeconds.ToString("F3", CultureInfo.InvariantCulture)}, " +
                $"offlineTime={saveSettings.offlineTime.ToString(CultureInfo.InvariantCulture)}, " +
                $"maxOfflineTime={saveSettings.maxOfflineTime.ToString(CultureInfo.InvariantCulture)}, " +
                $"doubleTimeBefore={saveSettings.sdPrestige.doubleTime.ToString(CultureInfo.InvariantCulture)}");
            if (seconds < 0) seconds = 0;
            saveSettings.sdPrestige.doubleTime += seconds;
            AwayFor?.Invoke(seconds);
        }

        private static string FormatDebugString(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? "n/a" : value;
        }

        private static string FormatUtc(DateTime value)
        {
            if (value == default) return "0001-01-01T00:00:00.0000000Z";
            return value.ToString("o", CultureInfo.InvariantCulture);
        }
    }
}
