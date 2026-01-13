using Systems.Stats;
using UnityEngine;

namespace IdleDysonSwarm.Data.Conditions
{
    /// <summary>
    /// Condition that checks if a facility count meets a threshold.
    /// Replaces hardcoded conditions like "assembly_lines_69" or "servers_total_gt_1".
    /// </summary>
    [CreateAssetMenu(menuName = "Game Data/Conditions/Facility Count")]
    public sealed class FacilityCountCondition : EffectCondition
    {
        [SerializeField]
        [Tooltip("The facility to check.")]
        private FacilityId _facilityId;

        [SerializeField]
        [Tooltip("Which count to evaluate (Total, ManualOnly, AutoOnly).")]
        private FacilityCountType _countType = FacilityCountType.Total;

        [SerializeField]
        [Tooltip("The comparison operator.")]
        private ComparisonOperator _operator = ComparisonOperator.GreaterOrEqual;

        [SerializeField]
        [Tooltip("The threshold value to compare against.")]
        private int _threshold;

        public override bool Evaluate(EffectContext context)
        {
            if (_facilityId == null || context.InfinityData == null)
                return false;

            double count = GetFacilityCount(context);
            return _operator.Compare(count, _threshold);
        }

        private double GetFacilityCount(EffectContext context)
        {
            var infinityData = context.InfinityData;
            string facilityIdValue = _facilityId.Value;

            double autoCount = 0;
            double manualCount = 0;

            switch (facilityIdValue)
            {
                case "assembly_lines":
                    autoCount = infinityData.assemblyLines[0];
                    manualCount = infinityData.assemblyLines[1];
                    break;
                case "ai_managers":
                    autoCount = infinityData.managers[0];
                    manualCount = infinityData.managers[1];
                    break;
                case "servers":
                    autoCount = infinityData.servers[0];
                    manualCount = infinityData.servers[1];
                    break;
                case "data_centers":
                    autoCount = infinityData.dataCenters[0];
                    manualCount = infinityData.dataCenters[1];
                    break;
                case "planets":
                    autoCount = infinityData.planets[0];
                    manualCount = infinityData.planets[1];
                    break;
                default:
                    Debug.LogWarning($"[FacilityCountCondition] Unknown facility ID: {facilityIdValue}");
                    return 0;
            }

            return _countType switch
            {
                FacilityCountType.AutoOnly => autoCount,
                FacilityCountType.ManualOnly => manualCount,
                FacilityCountType.Total => autoCount + manualCount,
                _ => 0
            };
        }

        protected override string GenerateDescription()
        {
            string facilityName = _facilityId != null ? _facilityId.Value : "???";
            string countTypeStr = _countType switch
            {
                FacilityCountType.AutoOnly => " (auto)",
                FacilityCountType.ManualOnly => " (manual)",
                _ => ""
            };
            return $"{facilityName}{countTypeStr} {_operator.ToSymbol()} {_threshold}";
        }

        public override string GetCurrentValuePreview(EffectContext context)
        {
            if (_facilityId == null || context.InfinityData == null)
                return "N/A";

            double count = GetFacilityCount(context);
            bool isMet = _operator.Compare(count, _threshold);
            return $"Current: {count:N0} ({(isMet ? "MET" : "NOT MET")})";
        }
    }
}
