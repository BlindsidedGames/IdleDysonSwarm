using System.Collections.Generic;
using IdleDysonSwarm.Data;
using UnityEngine;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Research Definition")]
    public sealed class ResearchDefinition : ScriptableObject
    {
        [SerializeField] private ResearchId _id;

        /// <summary>
        /// Strongly-typed research ID asset reference.
        /// </summary>
        public ResearchId Id => _id;

        /// <summary>
        /// String representation of the research ID for backward compatibility.
        /// </summary>
        public string id => _id != null ? _id.Value : string.Empty;
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
