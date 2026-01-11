using UnityEngine;
using Systems.Stats;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Effect Definition")]
    public sealed class EffectDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        public string targetStatId;
        public StatOperation operation;
        public double value;
        public double perLevel;
        public int order;
        public string conditionId;
        public string[] targetFacilityIds;
        public string[] targetFacilityTags;
    }
}
