using System;
using System.Collections.Generic;
using System.Text;
using Blindsided.Utilities;
using Systems.Stats;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

// Color constants for breakdown text formatting
// Using colors from UITheme: accent (orange) for delta, positive (green) for total

namespace Systems.Facilities
{
    public sealed class FacilityBreakdownPopup : MonoBehaviour
    {
        /// <summary>
        /// Static instance for global access (e.g., closing popup on tab switch).
        /// </summary>
        public static FacilityBreakdownPopup Instance { get; private set; }

        // Rich text color tags matching UITheme colors
        private const string ColorDelta = "<color=#FFA45E>"; // Orange (accent) for positive delta
        private const string ColorNegative = "<color=#FF5757>"; // Red (negative) for negative delta
        private const string ColorTotal = "<color=#91DD8F>"; // Green (positive)
        private const string ColorValue = "<color=#00E1FF>"; // Cyan (highlight) for operation values
        private const string ColorEnd = "</color>";
        private const float RefreshInterval = 0.1f; // 10Hz refresh rate

        [SerializeField] private GameObject root;
        [SerializeField] private TMP_Text titleText;
        [SerializeField] private TMP_Text valueText;
        [SerializeField] private TMP_Text breakdownText;
        [SerializeField] private Button closeButton;

        private string _currentFacilityId;
        private float _refreshTimer;

        private void Awake()
        {
            Instance = this;

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

            _currentFacilityId = facilityId;
            _refreshTimer = 0f;
            RefreshContent();

            if (root != null) root.SetActive(true);
        }

        private void Update()
        {
            if (root == null || !root.activeSelf || string.IsNullOrEmpty(_currentFacilityId)) return;

            _refreshTimer += Time.deltaTime;
            if (_refreshTimer >= RefreshInterval)
            {
                _refreshTimer = 0f;
                RefreshContent();
            }
        }

        private void RefreshContent()
        {
            if (oracle == null)
            {
                Debug.LogWarning("Oracle not ready for facility breakdown popup.");
                return;
            }

            DysonVerseInfinityData infinityData = oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
            DysonVersePrestigeData prestigeData = oracle.saveSettings.dysonVerseSaveData.dysonVersePrestigeData;
            DysonVerseSkillTreeData skillTreeData = oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
            PrestigePlus prestigePlus = oracle.saveSettings.prestigePlus;

            if (!FacilityRuntimeBuilder.TryBuildRuntime(_currentFacilityId, infinityData, prestigeData, skillTreeData, prestigePlus, out FacilityRuntime runtime))
            {
                ApplyFallbackText(_currentFacilityId);
                return;
            }

            string displayName = runtime.Definition != null && !string.IsNullOrEmpty(runtime.Definition.displayName)
                ? runtime.Definition.displayName
                : _currentFacilityId;

            if (titleText != null) titleText.text = displayName;
            if (valueText != null) valueText.text = $"{ColorTotal}{CalcUtils.FormatNumber(runtime.State.ProductionRate)}{ColorEnd}";
            if (breakdownText != null)
                breakdownText.text = BuildBreakdownText(runtime, infinityData, prestigeData, skillTreeData, prestigePlus);
        }

        public void Hide()
        {
            _currentFacilityId = null;
            if (root != null) root.SetActive(false);
        }

        private void ApplyFallbackText(string facilityId)
        {
            if (titleText != null) titleText.text = facilityId;
            if (valueText != null) valueText.text = "N/A";
            if (breakdownText != null) breakdownText.text = "Breakdown unavailable.";
            if (root != null) root.SetActive(true);
        }

        private static string BuildBreakdownText(FacilityRuntime runtime, DysonVerseInfinityData infinityData,
            DysonVersePrestigeData prestigeData, DysonVerseSkillTreeData skillTreeData, PrestigePlus prestigePlus)
        {
            if (runtime == null || runtime.Breakdown == null)
            {
                return "Breakdown unavailable.";
            }

            var builder = new StringBuilder();
            string facilityId = runtime.Definition != null ? runtime.Definition.id : runtime.Breakdown.FacilityId;
            AppendFacilityBreakdown(builder, runtime, facilityId);
            AppendUpstreamBreakdownSections(builder, facilityId, infinityData, prestigeData, skillTreeData, prestigePlus);
            AppendPlanetGenerationSection(builder, facilityId, infinityData, skillTreeData, prestigeData, prestigePlus);
            AppendLegend(builder);

            return builder.ToString();
        }

        private static void AppendFacilityBreakdown(StringBuilder builder, FacilityRuntime runtime, string facilityId)
        {
            if (builder == null || runtime == null || runtime.Breakdown == null) return;

            List<Contribution> mainContributions =
                FilterContributions(runtime.Breakdown.Contributions, GetExcludedContributionIds(facilityId));
            AppendContributionSection(builder, null, mainContributions);
            if (ShouldShowBonusInMainBreakdown(facilityId))
            {
                AppendBonusSections(builder, facilityId, runtime.Breakdown.Contributions);
            }
        }

        private static void AppendContributionSection(StringBuilder builder, string header, IReadOnlyList<Contribution> contributions)
        {
            if (builder == null) return;

            if (!string.IsNullOrEmpty(header))
            {
                if (builder.Length > 0) builder.AppendLine();
                builder.AppendLine(header);
            }

            if (contributions == null || contributions.Count == 0)
            {
                builder.AppendLine("No contributions.");
                return;
            }

            double runningTotal = 0;
            foreach (Contribution contribution in contributions)
            {
                string source = string.IsNullOrEmpty(contribution.SourceName)
                    ? contribution.SourceId
                    : contribution.SourceName;
                runningTotal += contribution.Delta;

                // Format: "Source ×1.5 (delta, total)" with colored values
                // Use symbols: × for Multiply, ^ for Power, + for Add, = for Override
                string opSymbol = GetOperationSymbol(contribution.Operation);

                // For Override on "Base", just show the source name without operation
                bool isBaseOverride = contribution.Operation == StatOperation.Override &&
                                      source.Equals("Base", StringComparison.OrdinalIgnoreCase);

                builder.Append(source);

                if (!isBaseOverride)
                {
                    builder.Append(' ')
                        .Append(ColorValue)
                        .Append(opSymbol)
                        .Append(CalcUtils.FormatNumber(contribution.Value))
                        .Append(ColorEnd);
                }

                // Use red for negative delta, orange for positive
                string deltaColor = contribution.Delta < 0 ? ColorNegative : ColorDelta;

                builder.Append(" (")
                    .Append(deltaColor)
                    .Append(CalcUtils.FormatNumber(contribution.Delta))
                    .Append(ColorEnd)
                    .Append(", ")
                    .Append(ColorTotal)
                    .Append(CalcUtils.FormatNumber(runningTotal))
                    .Append(ColorEnd)
                    .Append(')');

                if (!string.IsNullOrEmpty(contribution.ConditionText))
                {
                    builder.Append(" if ").Append(contribution.ConditionText);
                }

                builder.AppendLine();
            }
        }

        private static string GetOperationSymbol(StatOperation operation)
        {
            return operation switch
            {
                StatOperation.Add => "+",
                StatOperation.Multiply => "×",
                StatOperation.Power => "^",
                StatOperation.Override => "=",
                StatOperation.ClampMin => "≥",
                StatOperation.ClampMax => "≤",
                _ => operation.ToString()
            };
        }

        private static void AppendUpstreamBreakdownSections(StringBuilder builder, string facilityId,
            DysonVerseInfinityData infinityData, DysonVersePrestigeData prestigeData, DysonVerseSkillTreeData skillTreeData,
            PrestigePlus prestigePlus)
        {
            if (builder == null || string.IsNullOrEmpty(facilityId)) return;
            if (!UpstreamBreakdownMap.TryGetValue(facilityId, out List<UpstreamBreakdownSpec> specs) || specs.Count == 0)
            {
                return;
            }

            bool wroteHeader = false;
            for (int i = 0; i < specs.Count; i++)
            {
                UpstreamBreakdownSpec spec = specs[i];

                // Skip mega-structures that aren't unlocked yet
                if (!IsMegaStructureUnlocked(spec.FacilityId, prestigeData))
                {
                    continue;
                }

                if (!FacilityRuntimeBuilder.TryBuildRuntime(spec.FacilityId, infinityData, prestigeData, skillTreeData, prestigePlus,
                        out FacilityRuntime runtime))
                {
                    continue;
                }

                string displayName = runtime.Definition != null && !string.IsNullOrEmpty(runtime.Definition.displayName)
                    ? runtime.Definition.displayName
                    : spec.FacilityId;

                if (!wroteHeader)
                {
                    if (builder.Length > 0) builder.AppendLine();
                    builder.AppendLine("Upstream Sources");
                    wroteHeader = true;
                }

                string upstreamFacilityId = runtime.Definition != null ? runtime.Definition.id : spec.FacilityId;
                List<Contribution> mainContributions =
                    FilterContributions(runtime.Breakdown.Contributions, GetExcludedContributionIds(upstreamFacilityId));
                double total = SumContributionDeltas(mainContributions);
                string summaryLine = $"{spec.LabelPrefix} {displayName} ({CalcUtils.FormatNumber(total)})";
                AppendSummaryLine(builder, summaryLine);
                AppendBonusSummaryLines(builder, upstreamFacilityId, runtime.Breakdown.Contributions);
            }
        }

        private static bool IsMegaStructureUnlocked(string facilityId, DysonVersePrestigeData prestigeData)
        {
            if (prestigeData == null) return true; // Allow non-mega-structures through

            return facilityId switch
            {
                "matrioshka_brains" => prestigeData.unlockedMatrioshkaBrains,
                "birch_planets" => prestigeData.unlockedBirchPlanets,
                "galactic_brains" => prestigeData.unlockedGalacticBrains,
                _ => true // Non-mega-structures are always "unlocked"
            };
        }

        private static void AppendPlanetGenerationSection(StringBuilder builder, string facilityId,
            DysonVerseInfinityData infinityData, DysonVerseSkillTreeData skillTreeData, DysonVersePrestigeData prestigeData,
            PrestigePlus prestigePlus)
        {
            if (builder == null || facilityId != "planets") return;
            if (!GlobalStatPipeline.TryCalculatePlanetGeneration(infinityData, skillTreeData, prestigeData, prestigePlus,
                    out GlobalStatPipeline.PlanetGenerationResult result))
            {
                return;
            }

            StatResult totalResult = result.TotalResult;
            if (totalResult == null || (totalResult.Contributions.Count == 0 && totalResult.Value == 0))
            {
                return;
            }

            string header = $"Planet Generation ({CalcUtils.FormatNumber(totalResult.Value)}/s)";
            AppendContributionSection(builder, header, totalResult.Contributions);
        }

        private static void AppendLegend(StringBuilder builder)
        {
            if (builder == null) return;
            builder.AppendLine();
            builder.Append("<size=80%>Effect, ")
                .Append(ColorValue).Append("Value").Append(ColorEnd)
                .Append(", ")
                .Append(ColorDelta).Append("+Delta").Append(ColorEnd)
                .Append("/")
                .Append(ColorNegative).Append("-Delta").Append(ColorEnd)
                .Append(", ")
                .Append(ColorTotal).Append("Total").Append(ColorEnd)
                .Append("</size>");
        }

        private static void AppendBonusSections(StringBuilder builder, string facilityId, IReadOnlyList<Contribution> contributions)
        {
            if (builder == null || contributions == null) return;
            IReadOnlyList<BonusContributionSpec> bonusSpecs = GetBonusSpecs(facilityId);
            if (bonusSpecs == null || bonusSpecs.Count == 0) return;

            for (int i = 0; i < bonusSpecs.Count; i++)
            {
                BonusContributionSpec spec = bonusSpecs[i];
                List<Contribution> matches = FilterContributions(contributions, spec.SourceId, true);
                if (matches.Count == 0) continue;

                double total = SumContributionDeltas(matches);
                string header = $"{spec.Label} ({CalcUtils.FormatNumber(total)})";
                AppendContributionSection(builder, header, matches);
            }
        }

        private static void AppendBonusSummaryLines(StringBuilder builder, string facilityId, IReadOnlyList<Contribution> contributions)
        {
            if (builder == null || contributions == null) return;
            IReadOnlyList<BonusContributionSpec> bonusSpecs = GetBonusSpecs(facilityId);
            if (bonusSpecs == null || bonusSpecs.Count == 0) return;

            for (int i = 0; i < bonusSpecs.Count; i++)
            {
                BonusContributionSpec spec = bonusSpecs[i];
                List<Contribution> matches = FilterContributions(contributions, spec.SourceId, true);
                if (matches.Count == 0) continue;

                double total = SumContributionDeltas(matches);
                AppendSummaryLine(builder, $"{spec.Label} ({CalcUtils.FormatNumber(total)})");
            }
        }

        private static void AppendSummaryLine(StringBuilder builder, string text)
        {
            if (builder == null || string.IsNullOrEmpty(text)) return;
            builder.AppendLine(text);
        }

        private static bool ShouldShowBonusInMainBreakdown(string facilityId)
        {
            return !string.Equals(facilityId, "planets", StringComparison.Ordinal);
        }

        private static double SumContributionDeltas(IReadOnlyList<Contribution> contributions)
        {
            if (contributions == null) return 0;
            double total = 0;
            for (int i = 0; i < contributions.Count; i++)
            {
                total += contributions[i].Delta;
            }

            return total;
        }

        private static List<Contribution> FilterContributions(IReadOnlyList<Contribution> contributions,
            HashSet<string> excludedIds)
        {
            var filtered = new List<Contribution>();
            if (contributions == null) return filtered;
            if (excludedIds == null || excludedIds.Count == 0)
            {
                filtered.AddRange(contributions);
                return filtered;
            }

            for (int i = 0; i < contributions.Count; i++)
            {
                Contribution contribution = contributions[i];
                if (!string.IsNullOrEmpty(contribution.SourceId) && excludedIds.Contains(contribution.SourceId))
                {
                    continue;
                }

                filtered.Add(contribution);
            }

            return filtered;
        }

        private static List<Contribution> FilterContributions(IReadOnlyList<Contribution> contributions, string sourceId, bool includeMatches)
        {
            var filtered = new List<Contribution>();
            if (contributions == null || string.IsNullOrEmpty(sourceId)) return filtered;

            for (int i = 0; i < contributions.Count; i++)
            {
                Contribution contribution = contributions[i];
                bool isMatch = string.Equals(contribution.SourceId, sourceId, System.StringComparison.Ordinal);
                if (includeMatches == isMatch)
                {
                    filtered.Add(contribution);
                }
            }

            return filtered;
        }

        private static HashSet<string> GetExcludedContributionIds(string facilityId)
        {
            IReadOnlyList<BonusContributionSpec> specs = GetBonusSpecs(facilityId);
            if (specs == null || specs.Count == 0) return null;

            var excluded = new HashSet<string>();
            for (int i = 0; i < specs.Count; i++)
            {
                if (!string.IsNullOrEmpty(specs[i].SourceId))
                {
                    excluded.Add(specs[i].SourceId);
                }
            }

            return excluded;
        }

        private static IReadOnlyList<BonusContributionSpec> GetBonusSpecs(string facilityId)
        {
            if (string.IsNullOrEmpty(facilityId)) return null;
            return BonusContributionMap.TryGetValue(facilityId, out List<BonusContributionSpec> specs) ? specs : null;
        }

        private struct UpstreamBreakdownSpec
        {
            public UpstreamBreakdownSpec(string labelPrefix, string facilityId)
            {
                LabelPrefix = labelPrefix;
                FacilityId = facilityId;
            }

            public string LabelPrefix;
            public string FacilityId;
        }

        private struct BonusContributionSpec
        {
            public BonusContributionSpec(string sourceId, string label)
            {
                SourceId = sourceId;
                Label = label;
            }

            public string SourceId;
            public string Label;
        }

        private static readonly Dictionary<string, List<BonusContributionSpec>> BonusContributionMap =
            new Dictionary<string, List<BonusContributionSpec>>
            {
                {
                    "planets",
                    new List<BonusContributionSpec>
                    {
                        new BonusContributionSpec("effect.pocket_dimensions.planets", "Bonus: Pocket Dimensions")
                    }
                }
            };

        private static readonly Dictionary<string, List<UpstreamBreakdownSpec>> UpstreamBreakdownMap =
            new Dictionary<string, List<UpstreamBreakdownSpec>>
            {
                {
                    "data_centers",
                    new List<UpstreamBreakdownSpec>
                    {
                        new UpstreamBreakdownSpec("Produced by", "planets")
                    }
                },
                {
                    "servers",
                    new List<UpstreamBreakdownSpec>
                    {
                        new UpstreamBreakdownSpec("Produced by", "data_centers")
                    }
                },
                {
                    "ai_managers",
                    new List<UpstreamBreakdownSpec>
                    {
                        new UpstreamBreakdownSpec("Produced by", "servers")
                    }
                },
                {
                    "assembly_lines",
                    new List<UpstreamBreakdownSpec>
                    {
                        new UpstreamBreakdownSpec("Produced by", "ai_managers")
                    }
                },
                // Mega-structure upstream sources
                {
                    "planets",
                    new List<UpstreamBreakdownSpec>
                    {
                        new UpstreamBreakdownSpec("Produced by", "matrioshka_brains")
                    }
                },
                {
                    "matrioshka_brains",
                    new List<UpstreamBreakdownSpec>
                    {
                        new UpstreamBreakdownSpec("Produced by", "birch_planets")
                    }
                },
                {
                    "birch_planets",
                    new List<UpstreamBreakdownSpec>
                    {
                        new UpstreamBreakdownSpec("Produced by", "galactic_brains")
                    }
                }
            };
    }
}
