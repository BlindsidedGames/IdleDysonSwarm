using UnityEngine;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Facility Definition")]
    public sealed class FacilityDefinition : ScriptableObject
    {
        public string id;
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
