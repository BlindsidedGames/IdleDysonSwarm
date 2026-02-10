using System.Collections.Generic;
using Blindsided.Utilities;
using Expansion;
using UnityEngine;
using UnityEngine.UI;

namespace Systems.Save
{
    /*
    Purpose (runtime): Single source of truth for "wipe save" flows.

    This exists to avoid brittle UnityEvent OnClick soup (CategoryStateSaver.SetState spam + wipe calls)
    and to ensure soft vs hard wipe semantics remain consistent.

    Primary entry points:
    - Soft wipe button -> SoftWipeKeepDebug()
    - Hard wipe button -> HardWipeRemoveDebug()

    Interacts with:
    - Expansion.Oracle (WipeAllDataKeepDebugEntitlement / WipeAllData).
    - Blindsided.Utilities.CategoryStateSaver (reset category UI states before wipe).
    - UnityEngine.PlayerPrefs ("initialScreen" default tab).

    Change notes:
    - Assign button references + CategoryStateSaver list in the inspector.
    - This script should live on an always-enabled root object.
    */
    public sealed class SaveWipeCoordinator : MonoBehaviour
    {
        [Header("Buttons")]
        [SerializeField] private Button softWipeKeepDebugButton;
        [SerializeField] private Button hardWipeRemoveDebugButton;

        [Header("UI Reset")]
        [Tooltip("Optional: hide/close the wipe UI after clicking (replaces the old GameObject.SetActive(false) entry).")]
        [SerializeField] private GameObject wipeUiToDisable;

        [Tooltip("CategoryStateSaver instances to reset (SetState(0)) before wiping.")]
        [SerializeField] private List<CategoryStateSaver> categoryStateSaversToReset = new List<CategoryStateSaver>();

        [Header("Post-Wipe Defaults")]
        [Tooltip("PlayerPrefs initialScreen value to set before wipe so the next load defaults to Bots tab. (Bots is 1 or 9 in SkillTreeSettingsManager.)")]
        [SerializeField] private int initialScreenAfterWipe = 1;

        private void Awake()
        {
            // Ensure entitlement store is ready for wipe semantics.
            PlayerEntitlementsStore.EnsureLoaded();
        }

        private void Start()
        {
            if (softWipeKeepDebugButton != null)
                softWipeKeepDebugButton.onClick.AddListener(SoftWipeKeepDebug);
            if (hardWipeRemoveDebugButton != null)
                hardWipeRemoveDebugButton.onClick.AddListener(HardWipeRemoveDebug);
        }

        public void SoftWipeKeepDebug()
        {
            ApplyPreWipeUiReset();
            if (Oracle.oracle == null)
            {
                Debug.LogWarning("[Wipe] Cannot soft-wipe: Oracle singleton not ready.");
                return;
            }

            Oracle.oracle.WipeAllDataKeepDebugEntitlement();
        }

        public void HardWipeRemoveDebug()
        {
            ApplyPreWipeUiReset();
            if (Oracle.oracle == null)
            {
                Debug.LogWarning("[Wipe] Cannot hard-wipe: Oracle singleton not ready.");
                return;
            }

            Oracle.oracle.WipeAllData();
        }

        private void ApplyPreWipeUiReset()
        {
            if (wipeUiToDisable != null)
                wipeUiToDisable.SetActive(false);

            // Replace the old OnClick list that set a bunch of states to 0.
            for (int i = 0; i < categoryStateSaversToReset.Count; i++)
            {
                CategoryStateSaver saver = categoryStateSaversToReset[i];
                if (saver == null) continue;
                saver.SetState(0);
            }

            PlayerPrefs.SetInt("initialScreen", initialScreenAfterWipe);
        }
    }
}

