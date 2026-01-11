using System.Collections.Generic;
using UnityEngine;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Skill Database")]
    public sealed class SkillDatabase : ScriptableObject
    {
        public List<SkillDefinition> skills = new List<SkillDefinition>();

        private Dictionary<string, SkillDefinition> _byId;

        private void OnEnable()
        {
            BuildLookup();
        }

        public bool TryGet(string id, out SkillDefinition definition)
        {
            if (_byId == null) BuildLookup();
            return _byId.TryGetValue(id, out definition);
        }

        private void BuildLookup()
        {
            _byId = new Dictionary<string, SkillDefinition>();
            foreach (SkillDefinition definition in skills)
            {
                if (definition == null || string.IsNullOrEmpty(definition.id)) continue;
                if (_byId.ContainsKey(definition.id))
                {
                    Debug.LogWarning($"Duplicate SkillDefinition id '{definition.id}' in {name}");
                    continue;
                }

                _byId.Add(definition.id, definition);
            }
        }
    }
}
