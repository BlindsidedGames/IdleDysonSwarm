using System.Collections.Generic;
using UnityEngine;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Research Database")]
    public sealed class ResearchDatabase : ScriptableObject
    {
        public List<ResearchDefinition> research = new List<ResearchDefinition>();

        private Dictionary<string, ResearchDefinition> _byId;

        private void OnEnable()
        {
            BuildLookup();
        }

        public bool TryGet(string id, out ResearchDefinition definition)
        {
            if (_byId == null) BuildLookup();
            return _byId.TryGetValue(id, out definition);
        }

        private void BuildLookup()
        {
            _byId = new Dictionary<string, ResearchDefinition>();
            foreach (ResearchDefinition definition in research)
            {
                if (definition == null || string.IsNullOrEmpty(definition.id)) continue;
                if (_byId.ContainsKey(definition.id))
                {
                    Debug.LogWarning($"Duplicate ResearchDefinition id '{definition.id}' in {name}");
                    continue;
                }

                _byId.Add(definition.id, definition);
            }
        }
    }
}
