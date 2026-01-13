using IdleDysonSwarm.Data;
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

        /// <summary>
        /// Gets a facility definition using a strongly-typed facility ID asset.
        /// </summary>
        public bool TryGetFacility(FacilityId id, out FacilityDefinition definition)
        {
            return TryGetFacility(id?.Value, out definition);
        }

        /// <summary>
        /// Gets a facility definition using a string ID (backward compatibility).
        /// </summary>
        public bool TryGetFacility(string id, out FacilityDefinition definition)
        {
            definition = null;
            return facilityDatabase != null && facilityDatabase.TryGet(id, out definition);
        }

        /// <summary>
        /// Gets a skill definition using a strongly-typed skill ID asset.
        /// </summary>
        public bool TryGetSkill(SkillId id, out SkillDefinition definition)
        {
            return TryGetSkill(id?.Value, out definition);
        }

        /// <summary>
        /// Gets a skill definition using a string ID (backward compatibility).
        /// </summary>
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

        /// <summary>
        /// Gets a research definition using a strongly-typed research ID asset.
        /// </summary>
        public bool TryGetResearch(ResearchId id, out ResearchDefinition definition)
        {
            return TryGetResearch(id?.Value, out definition);
        }

        /// <summary>
        /// Gets a research definition using a string ID (backward compatibility).
        /// </summary>
        public bool TryGetResearch(string id, out ResearchDefinition definition)
        {
            definition = null;
            return researchDatabase != null && researchDatabase.TryGet(id, out definition);
        }
    }
}
