using GameData;
using IdleDysonSwarm.Data;
using Systems.Facilities;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Default implementation of IGameDataService that wraps GameDataRegistry.
    /// Provides dependency-injectable access to game definition data.
    /// </summary>
    public sealed class GameDataService : IGameDataService
    {
        private readonly GameDataRegistry _registry;

        public GameDataService(GameDataRegistry registry)
        {
            _registry = registry;
        }

        public bool TryGetFacility(string id, out FacilityDefinition definition)
        {
            definition = null;
            return _registry != null && _registry.TryGetFacility(id, out definition);
        }

        public bool TryGetFacility(FacilityId id, out FacilityDefinition definition)
        {
            definition = null;
            return _registry != null && _registry.TryGetFacility(id, out definition);
        }

        public bool TryGetSkill(string id, out SkillDefinition definition)
        {
            definition = null;
            return _registry != null && _registry.TryGetSkill(id, out definition);
        }

        public bool TryGetSkill(SkillId id, out SkillDefinition definition)
        {
            definition = null;
            return _registry != null && _registry.TryGetSkill(id, out definition);
        }

        public bool TryGetResearch(string id, out ResearchDefinition definition)
        {
            definition = null;
            return _registry != null && _registry.TryGetResearch(id, out definition);
        }

        public bool TryGetResearch(ResearchId id, out ResearchDefinition definition)
        {
            definition = null;
            return _registry != null && _registry.TryGetResearch(id, out definition);
        }

        public bool TryGetEffect(string id, out EffectDefinition definition)
        {
            definition = null;
            return _registry != null && _registry.TryGetEffect(id, out definition);
        }
    }
}
