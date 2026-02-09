using System.Collections.Generic;
using UnityEngine;

namespace Expansion
{
    /// <summary>
    /// Skill preset synchronization helpers.
    /// </summary>
    /// <remarks>
    /// This is split out of <c>Oracle.cs</c> to keep save/clipboard logic isolated and to make future refactors
    /// (moving preset logic behind a service) straightforward.
    /// </remarks>
    public partial class Oracle
    {
        private void LogPresetAutoAssignState(string label)
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null)
            {
                Debug.Log($"[PresetAutoAssign:{label}] save data missing");
                return;
            }

            Debug.Log(
                $"[PresetAutoAssign:{label}] " +
                $"p1={FormatPresetList(data.skillAutoAssignmentIds1)} " +
                $"p2={FormatPresetList(data.skillAutoAssignmentIds2)} " +
                $"p3={FormatPresetList(data.skillAutoAssignmentIds3)} " +
                $"p4={FormatPresetList(data.skillAutoAssignmentIds4)} " +
                $"p5={FormatPresetList(data.skillAutoAssignmentIds5)}");
        }

        private void SyncAutoAssignFromSelectedPreset(bool runAutoAssign)
        {
            DysonVerseSaveData data = saveSettings?.dysonVerseSaveData;
            if (data == null) return;
            int presetIndex = Mathf.Clamp(data.selectedPreset, 1, 5);
            List<string> presetIds = GetPresetAutoAssignmentSkillIds(presetIndex);
            if (presetIds == null || presetIds.Count == 0) return;
            SetAutoAssignmentSkillIds(new List<string>(presetIds));
            if (runAutoAssign && _gameManager != null)
            {
                _gameManager.AutoAssignSkillsInvoke();
            }
        }

        private static string FormatPresetList(List<string> ids)
        {
            if (ids == null) return "null";
            if (ids.Count == 0) return "empty";
            return $"{ids.Count}:[{string.Join(",", ids)}]";
        }
    }
}

