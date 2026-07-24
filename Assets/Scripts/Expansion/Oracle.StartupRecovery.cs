/*
 * Purpose: Connects Stage 3 startup recovery decisions to Oracle publication and the persistent Load-scene UI.
 * Runs: Runtime during Oracle.Load and Oracle.Start.
 * Primary entry points: TryRunPreparedStartupRecovery and ShowBlockingStartupRecovery.
 * Owns: One-shot publication/replay authorization, blocked-startup state, and explicit recovery callbacks.
 * Delegates: Candidate policy to StartupSaveRecoveryCoordinator and presentation to StartupRecoveryView.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/Oracle.Persistence.cs.
 * - Assets/Scripts/Expansion/Oracle.cs.
 * - Assets/Scripts/Systems/Save/StartupSaveRecoveryCoordinator.cs.
 * - Assets/Scripts/User Interface/StartupRecoveryView.cs.
 *
 * Change notes:
 * - Blocking outcomes must keep Loaded/save-ready false and must not schedule offline replay or canonical writes.
 * - Automatic recovery publishes exactly once only after verified canonical restoration.
 * - Clipboard import commits safely, then reloads scene zero rather than publishing into the blocked runtime.
 */

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using Systems.Save;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Expansion
{
    /// <summary>
    /// Implements the Stage 3 startup recovery decision and blocking interaction bridge.
    /// </summary>
    public partial class Oracle
    {
        private StartupSaveRecoveryResult _startupRecoveryResult;
        private StartupRecoveryInteractionSession _startupRecoveryInteraction;
        private bool _startupRecoveryBlocked;

        /// <summary>
        /// Runs prepared startup selection for the production canonical store.
        /// </summary>
        /// <param name="isColdStartLoad">Whether this is the first runtime load.</param>
        /// <returns><see langword="true"/> when the prepared Stage 3 path handled startup.</returns>
        private bool TryRunPreparedStartupRecovery(bool isColdStartLoad)
        {
            if (!(_saveStore is CanonicalSaveStore canonicalStore))
            {
                return false;
            }

            string legacyOdinPath = Path.Combine(
                Application.persistentDataPath,
                fileName + ".idsOdin");
            IReadOnlyList<SaveStorageCandidate> legacyCandidates =
                LegacySaveCandidateAdapter.Discover(legacyOdinPath);
            var coordinator = new StartupSaveRecoveryCoordinator(canonicalStore);
            _startupRecoveryResult = coordinator.Resolve(legacyCandidates);
            _startupRecoveryBlocked = _startupRecoveryResult.IsBlocking;
            _startupRecoveryInteraction = _startupRecoveryBlocked
                ? new StartupRecoveryInteractionSession(
                    canonicalStore,
                    _startupRecoveryResult,
                    () => _clock.UtcNow)
                : null;

            if (_startupRecoveryBlocked)
            {
                _canonicalWriteBlockedByUnpreparedArtifact = true;
                Loaded = false;
                SetSaveReady(false);
                Debug.LogError(
                    $"[SaveRecovery] Startup blocked: status={_startupRecoveryResult.Status}, " +
                    $"artifacts={_startupRecoveryResult.Artifacts.Count}, error={_startupRecoveryResult.Error}");
                return true;
            }

            _canonicalWriteBlockedByUnpreparedArtifact = false;
            bool createdNewSave = _startupRecoveryResult.Status == StartupSaveRecoveryStatus.NoArtifacts;
            if (createdNewSave)
            {
                saveSettings.dateStarted = _clock.UtcNow.ToString(CultureInfo.InvariantCulture);
                Loaded = true;
                Debug.Log("[SaveRecovery] No save artifacts found; creating first-run save.");
            }
            else
            {
                var publicationGate = new StartupRecoveryPublicationGate();
                bool replayAuthorized = false;
                bool published = publicationGate.TryPublish(
                    _startupRecoveryResult,
                    settings => ApplyLoadedSettings(
                        settings,
                        GetStartupRecoverySourceLabel(_startupRecoveryResult)),
                    () => replayAuthorized = true);
                if (!published || !replayAuthorized)
                {
                    _startupRecoveryBlocked = true;
                    _canonicalWriteBlockedByUnpreparedArtifact = true;
                    Loaded = false;
                    SetSaveReady(false);
                    Debug.LogError("[SaveRecovery] Prepared startup result could not cross the publication gate.");
                    return true;
                }

                if (_startupRecoveryResult.Status == StartupSaveRecoveryStatus.RecoveredCanonical ||
                    _startupRecoveryResult.Status == StartupSaveRecoveryStatus.RecoveredLegacy)
                {
                    Debug.LogWarning(
                        $"[SaveRecovery] Automatically restored {_startupRecoveryResult.SelectedCandidate.Source} " +
                        $"from '{_startupRecoveryResult.SelectedCandidate.Path}'.");
                }
            }

            SyncAutoAssignFromSelectedPreset(runAutoAssign: true);
            UpdateSkills?.Invoke();
            StartCoroutine(AwayForCoroutine(isColdStartLoad));
            if (!isColdStartLoad)
            {
                SetSaveReady(true);
            }

            if (createdNewSave)
            {
                try
                {
                    SaveInternal(force: true, updateQuitTime: false);
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[Save] Failed writing first-run canonical save: {ex.Message}");
                }
            }

            return true;
        }

        /// <summary>
        /// Shows the blocking recovery view on the persistent canvas created by the initial Load scene.
        /// </summary>
        private void ShowBlockingStartupRecovery()
        {
            if (!_startupRecoveryBlocked || _startupRecoveryInteraction == null)
            {
                return;
            }

            if (LoadScreenMethods.lsm == null)
            {
                Debug.LogError("[SaveRecovery] Blocking recovery UI unavailable: LoadScreenMethods was not found.");
                return;
            }

            StartupRecoveryView view =
                LoadScreenMethods.lsm.GetComponent<StartupRecoveryView>() ??
                LoadScreenMethods.lsm.gameObject.AddComponent<StartupRecoveryView>();
            view.Show(
                _startupRecoveryInteraction,
                ConfirmStartupRecoveryReset,
                ReloadAfterStartupRecoveryImport);
        }

        /// <summary>
        /// Performs the already-confirmed destructive reset through the existing complete-wipe path.
        /// </summary>
        private void ConfirmStartupRecoveryReset()
        {
            WipeAllDataKeepDebugEntitlement();
        }

        /// <summary>
        /// Reloads the initial scene after a verified clipboard import is safely committed.
        /// </summary>
        private static void ReloadAfterStartupRecoveryImport()
        {
            SceneManager.LoadScene(0);
        }

        /// <summary>
        /// Formats the selected source for the existing Oracle publication diagnostic.
        /// </summary>
        /// <param name="result">The successful startup result.</param>
        /// <returns>A stable human-readable source label.</returns>
        private static string GetStartupRecoverySourceLabel(StartupSaveRecoveryResult result)
        {
            return result.Status switch
            {
                StartupSaveRecoveryStatus.PrimaryReady => "canonical save file",
                StartupSaveRecoveryStatus.RecoveredCanonical =>
                    $"automatic canonical recovery ({result.SelectedCandidate?.Source})",
                StartupSaveRecoveryStatus.RecoveredLegacy =>
                    $"automatic legacy recovery ({result.SelectedCandidate?.Source})",
                _ => "prepared startup save"
            };
        }
    }
}
