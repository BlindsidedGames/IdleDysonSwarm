using System.Collections.Generic;
using UnityEngine;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Effect Database")]
    public sealed class EffectDatabase : ScriptableObject
    {
        public List<EffectDefinition> effects = new List<EffectDefinition>();

        private Dictionary<string, EffectDefinition> _byId;

        private void OnEnable()
        {
            BuildLookup();
        }

        public bool TryGet(string id, out EffectDefinition definition)
        {
            if (_byId == null) BuildLookup();
            return _byId.TryGetValue(id, out definition);
        }

        private void BuildLookup()
        {
            _byId = new Dictionary<string, EffectDefinition>();
            foreach (EffectDefinition definition in effects)
            {
                if (definition == null || string.IsNullOrEmpty(definition.id)) continue;
                if (_byId.ContainsKey(definition.id))
                {
                    Debug.LogWarning($"Duplicate EffectDefinition id '{definition.id}' in {name}");
                    continue;
                }

                _byId.Add(definition.id, definition);
            }
        }
    }
}
