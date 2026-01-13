using System.Collections.Generic;
using IdleDysonSwarm.Data;
using UnityEngine;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Skill Definition")]
    public sealed class SkillDefinition : ScriptableObject
    {
        [SerializeField] private SkillId _id;

        /// <summary>
        /// Strongly-typed skill ID asset reference.
        /// </summary>
        public SkillId Id => _id;

        /// <summary>
        /// String representation of the skill ID for backward compatibility.
        /// </summary>
        public string id => _id != null ? _id.Value : string.Empty;
        public string displayName;
        [TextArea] public string description;
        [TextArea] public string technicalDescription;
        public int cost = 1;
        public bool refundable = true;
        public bool isFragment;
        public bool purityLine;
        public bool terraLine;
        public bool powerLine;
        public bool paragadeLine;
        public bool stellarLine;
        public bool firstRunBlocked;
        public string[] requiredSkillIds;
        public string[] shadowRequirementIds;
        public string[] exclusiveWithIds;
        public string[] unrefundableWithIds;
        public List<EffectDefinition> effects = new List<EffectDefinition>();
    }
}
