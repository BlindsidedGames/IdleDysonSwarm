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
    }
}
