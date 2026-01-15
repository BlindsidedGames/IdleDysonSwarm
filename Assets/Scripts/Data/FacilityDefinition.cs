using IdleDysonSwarm.Data;
using UnityEngine;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Facility Definition")]
    public sealed class FacilityDefinition : ScriptableObject
    {
        [SerializeField] private FacilityId _id;

        /// <summary>
        /// Strongly-typed facility ID asset reference.
        /// </summary>
        public FacilityId Id => _id;

        /// <summary>
        /// String representation of the facility ID for backward compatibility.
        /// </summary>
        public string id => _id != null ? _id.Value : string.Empty;
        public string displayName;
        [TextArea] public string description;
        public Sprite icon;
        public string[] tags;
        public double baseCost = 1;
        public double costExponent = 1.15;
        public double baseProduction;
        public string productionStatId;
        public string wordUsed;
        public string productionWordUsed;
        public string purchasePrompt;

        [Header("Facility-Based Cost (Mega-Structures)")]
        [Tooltip("If true, this facility costs other facilities instead of currency")]
        public bool usesFacilityCost;

        [Tooltip("The facility consumed to purchase this one")]
        public FacilityId costFacilityId;

        [Tooltip("Base amount of facilities consumed per purchase")]
        public double baseFacilityCost = 100;

        [Tooltip("Cost scaling exponent per purchase")]
        public double facilityCostExponent = 1.5;

        [Header("Secondary Facility Cost (Galactic Brain)")]
        [Tooltip("Optional second facility required for purchase")]
        public FacilityId secondaryCostFacilityId;

        [Tooltip("Base amount of secondary facility consumed")]
        public double secondaryBaseCost;

        [Tooltip("Secondary cost scaling exponent")]
        public double secondaryCostExponent = 1.5;
    }
}
