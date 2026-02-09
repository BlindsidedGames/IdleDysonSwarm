using System;
using System.Collections.Generic;
using UnityEngine;

namespace Expansion
{
    /// <summary>
    /// Autosave scheduling and preset sync helpers for <see cref="Oracle"/>.
    /// </summary>
    /// <remarks>
    /// The canonical save pipeline lives in <c>Systems.Save</c>, but Oracle still needs to decide when to persist.
    /// This file groups the "when/trigger" logic (autosave, debounced quick saves, preset sync scopes).
    /// </remarks>
    public partial class Oracle
    {
        private bool _isSaveReady;
        private bool _autoSaveScheduled;
        private bool _quickSaveScheduled;
        private int _suppressPresetSyncDepth;

        private const float QuickSaveDelaySeconds = 0.25f;

        private void SetSaveReady(bool ready)
        {
            _isSaveReady = ready;
            if (_isSaveReady) ScheduleAutoSave();
        }

        public IDisposable SuppressPresetSync()
        {
            _suppressPresetSyncDepth++;
            return new PresetSyncScope(this);
        }

        private sealed class PresetSyncScope : IDisposable
        {
            private Oracle _owner;

            public PresetSyncScope(Oracle owner)
            {
                _owner = owner;
            }

            public void Dispose()
            {
                if (_owner == null) return;
                _owner._suppressPresetSyncDepth = Mathf.Max(0, _owner._suppressPresetSyncDepth - 1);
                _owner = null;
            }
        }

        private bool IsPresetSyncSuppressed()
        {
            return _suppressPresetSyncDepth > 0;
        }

        private void ScheduleAutoSave()
        {
            if (_autoSaveScheduled) return;
            InvokeRepeating(nameof(Save), 60, 60);
            _autoSaveScheduled = true;
        }

        private void ScheduleQuickSave()
        {
            if (!_isSaveReady) return;
            // Debounce rapid UI interactions (skill assign/unassign, sliders, etc.)
            CancelInvoke(nameof(QuickSave));
            Invoke(nameof(QuickSave), QuickSaveDelaySeconds);
            _quickSaveScheduled = true;
        }

        private void QuickSave()
        {
            _quickSaveScheduled = false;
            SaveInternal(false);
        }

        public void SyncSelectedPresetAutoAssignFromCurrent()
        {
            if (IsPresetSyncSuppressed()) return;

            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;

            int presetIndex = Mathf.Clamp(data.selectedPreset, 1, 5);
            // Clone to avoid sharing list references between "current" and slot storage.
            List<string> ids = new List<string>(GetAutoAssignmentSkillIds());
            SetPresetAutoAssignmentSkillIds(presetIndex, ids);
            SyncSelectedPresetBotDistributionFromCurrent();
        }

        public void SyncSelectedPresetBotDistributionFromCurrent()
        {
            if (IsPresetSyncSuppressed()) return;

            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;

            int presetIndex = Mathf.Clamp(data.selectedPreset, 1, 5);
            switch (presetIndex)
            {
                case 1:
                    data.botDistPreset1 = prestigeData.botDistribution;
                    break;
                case 2:
                    data.botDistPreset2 = prestigeData.botDistribution;
                    break;
                case 3:
                    data.botDistPreset3 = prestigeData.botDistribution;
                    break;
                case 4:
                    data.botDistPreset4 = prestigeData.botDistribution;
                    break;
                case 5:
                    data.botDistPreset5 = prestigeData.botDistribution;
                    break;
            }

            ScheduleQuickSave();
        }
    }
}

