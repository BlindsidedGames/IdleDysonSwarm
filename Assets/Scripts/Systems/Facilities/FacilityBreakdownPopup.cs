using System.Text;
using Blindsided.Utilities;
using Systems.Stats;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

namespace Systems.Facilities
{
    public sealed class FacilityBreakdownPopup : MonoBehaviour
    {
        [SerializeField] private GameObject root;
        [SerializeField] private TMP_Text titleText;
        [SerializeField] private TMP_Text valueText;
        [SerializeField] private TMP_Text breakdownText;
        [SerializeField] private Button closeButton;

        private void Awake()
        {
            if (root == null)
            {
                root = gameObject;
            }

            if (closeButton != null)
            {
                closeButton.onClick.AddListener(Hide);
            }
        }

        public void ShowFacility(string facilityId)
        {
            if (string.IsNullOrEmpty(facilityId)) return;
            if (oracle == null)
            {
                Debug.LogWarning("Oracle not ready for facility breakdown popup.");
                return;
            }

            DysonVerseInfinityData infinityData = oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
            DysonVersePrestigeData prestigeData = oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
            DysonVerseSkillTreeData skillTreeData = oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
            PrestigePlus prestigePlus = oracle.saveSettings.prestigePlus;

            if (!FacilityRuntimeBuilder.TryBuildRuntime(facilityId, infinityData, prestigeData, skillTreeData, prestigePlus, out FacilityRuntime runtime))
            {
                ApplyFallbackText(facilityId);
                return;
            }

            string displayName = runtime.Definition != null && !string.IsNullOrEmpty(runtime.Definition.displayName)
                ? runtime.Definition.displayName
                : facilityId;

            if (titleText != null) titleText.text = displayName;
            if (valueText != null) valueText.text = CalcUtils.FormatNumber(runtime.State.ProductionRate);
            if (breakdownText != null) breakdownText.text = BuildBreakdownText(runtime.Breakdown);

            if (root != null) root.SetActive(true);
        }

        public void Hide()
        {
            if (root != null) root.SetActive(false);
        }

        private void ApplyFallbackText(string facilityId)
        {
            if (titleText != null) titleText.text = facilityId;
            if (valueText != null) valueText.text = "N/A";
            if (breakdownText != null) breakdownText.text = "Breakdown unavailable.";
            if (root != null) root.SetActive(true);
        }

        private static string BuildBreakdownText(FacilityBreakdown breakdown)
        {
            if (breakdown == null || breakdown.Contributions == null || breakdown.Contributions.Count == 0)
            {
                return "No contributions.";
            }

            var builder = new StringBuilder();
            double runningTotal = 0;
            foreach (Contribution contribution in breakdown.Contributions)
            {
                string source = string.IsNullOrEmpty(contribution.SourceName)
                    ? contribution.SourceId
                    : contribution.SourceName;
                runningTotal += contribution.Delta;
                builder.Append(source)
                    .Append(" [")
                    .Append(contribution.Operation)
                    .Append("] ")
                    .Append(CalcUtils.FormatNumber(contribution.Value))
                    .Append(" (delta ")
                    .Append(CalcUtils.FormatNumber(contribution.Delta))
                    .Append(", total ")
                    .Append(CalcUtils.FormatNumber(runningTotal))
                    .Append(')');

                if (!string.IsNullOrEmpty(contribution.ConditionText))
                {
                    builder.Append(" if ").Append(contribution.ConditionText);
                }

                builder.AppendLine();
            }

            return builder.ToString();
        }
    }
}

