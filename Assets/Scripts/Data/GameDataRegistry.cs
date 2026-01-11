using UnityEngine;

namespace GameData
{
    public sealed class GameDataRegistry : MonoBehaviour
    {
        public FacilityDatabase facilityDatabase;
        public SkillDatabase skillDatabase;
        public EffectDatabase effectDatabase;
        public ResearchDatabase researchDatabase;

        public static GameDataRegistry Instance { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
        }

        public bool TryGetFacility(string id, out FacilityDefinition definition)
        {
            definition = null;
            return facilityDatabase != null && facilityDatabase.TryGet(id, out definition);
        }

        public bool TryGetSkill(string id, out SkillDefinition definition)
        {
            definition = null;
            return skillDatabase != null && skillDatabase.TryGet(id, out definition);
        }

        public bool TryGetEffect(string id, out EffectDefinition definition)
        {
            definition = null;
            return effectDatabase != null && effectDatabase.TryGet(id, out definition);
        }

        public bool TryGetResearch(string id, out ResearchDefinition definition)
        {
            definition = null;
            return researchDatabase != null && researchDatabase.TryGet(id, out definition);
        }
    }
}
