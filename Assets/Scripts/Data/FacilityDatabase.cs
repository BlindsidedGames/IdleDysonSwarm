using System.Collections.Generic;
using UnityEngine;

namespace GameData
{
    [CreateAssetMenu(menuName = "Idle Dyson/Facility Database")]
    public sealed class FacilityDatabase : ScriptableObject
    {
        public List<FacilityDefinition> facilities = new List<FacilityDefinition>();

        private Dictionary<string, FacilityDefinition> _byId;

        private void OnEnable()
        {
            BuildLookup();
        }

        public bool TryGet(string id, out FacilityDefinition definition)
        {
            if (_byId == null) BuildLookup();
            return _byId.TryGetValue(id, out definition);
        }

        private void BuildLookup()
        {
            _byId = new Dictionary<string, FacilityDefinition>();
            foreach (FacilityDefinition definition in facilities)
            {
                if (definition == null || string.IsNullOrEmpty(definition.id)) continue;
                if (_byId.ContainsKey(definition.id))
                {
                    Debug.LogWarning($"Duplicate FacilityDefinition id '{definition.id}' in {name}");
                    continue;
                }

                _byId.Add(definition.id, definition);
            }
        }
    }
}
