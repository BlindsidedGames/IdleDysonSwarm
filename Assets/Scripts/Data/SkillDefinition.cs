using System.Collections.Generic;
using UnityEngine;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Skill Definition")]
    public sealed class SkillDefinition : ScriptableObject
    {
        public string id;
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
