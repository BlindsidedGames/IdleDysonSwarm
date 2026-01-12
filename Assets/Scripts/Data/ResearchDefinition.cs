using System.Collections.Generic;
using UnityEngine;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Research Definition")]
    public sealed class ResearchDefinition : ScriptableObject
    {
        public string id;
        public string displayName;
        [TextArea] public string description;
        public double baseCost = 1;
        public double exponent = 1.15;
        public int maxLevel = -1;
        public ResearchAutoBuyGroup autoBuyGroup = ResearchAutoBuyGroup.Inherit;
        public string[] prerequisiteResearchIds;
        public List<EffectDefinition> effects = new List<EffectDefinition>();
    }
}
