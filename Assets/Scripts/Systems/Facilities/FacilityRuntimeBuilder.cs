using GameData;
using Systems.Stats;
using static Expansion.Oracle;

namespace Systems.Facilities
{
    public static class FacilityRuntimeBuilder
    {
        public static bool TryBuildRuntime(string facilityId, DysonVerseInfinityData infinityData,
            DysonVersePrestigeData prestigeData, DysonVerseSkillTreeData skillTreeData, PrestigePlus prestigePlus, out FacilityRuntime runtime)
        {
            runtime = null;
            if (string.IsNullOrEmpty(facilityId) || infinityData == null) return false;

            GameDataRegistry registry = GameDataRegistry.Instance;
            if (registry == null || !registry.TryGetFacility(facilityId, out FacilityDefinition definition))
            {
                return false;
            }

            FacilityState state = BuildFacilityState(facilityId, infinityData);
            if (state == null) return false;

            var context = new EffectContext(infinityData, prestigeData, skillTreeData, prestigePlus);
            runtime = FacilityEffectPipeline.BuildRuntimeFromDefinitions(definition, state, context);
            return runtime != null;
        }

        public static FacilityState BuildFacilityState(string facilityId, DysonVerseInfinityData infinityData)
        {
            if (string.IsNullOrEmpty(facilityId) || infinityData == null) return null;

            switch (facilityId)
            {
                case "assembly_lines":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = infinityData.assemblyLines[1],
                        AutoOwned = infinityData.assemblyLines[0],
                        EffectiveCount = infinityData.assemblyLines[0] + infinityData.assemblyLines[1]
                    };
                case "ai_managers":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = infinityData.managers[1],
                        AutoOwned = infinityData.managers[0],
                        EffectiveCount = infinityData.managers[0] + infinityData.managers[1]
                    };
                case "servers":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = infinityData.servers[1],
                        AutoOwned = infinityData.servers[0],
                        EffectiveCount = infinityData.servers[0] + infinityData.servers[1]
                    };
                case "data_centers":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = infinityData.dataCenters[1],
                        AutoOwned = infinityData.dataCenters[0],
                        EffectiveCount = infinityData.dataCenters[0] + infinityData.dataCenters[1]
                    };
                case "planets":
                    return new FacilityState
                    {
                        FacilityId = facilityId,
                        ManualOwned = infinityData.planets[1],
                        AutoOwned = infinityData.planets[0],
                        EffectiveCount = infinityData.planets[0] + infinityData.planets[1]
                    };
                default:
                    return null;
            }
        }
    }
}

