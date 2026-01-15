using GameData;
using IdleDysonSwarm.Data;
using Systems.Stats;
using static Expansion.Oracle;

namespace Systems.Facilities
{
    public static class FacilityRuntimeBuilder
    {
        /// <summary>
        /// Builds a facility runtime using a strongly-typed facility ID asset.
        /// </summary>
        public static bool TryBuildRuntime(FacilityId facilityId, DysonVerseInfinityData infinityData,
            DysonVersePrestigeData prestigeData, DysonVerseSkillTreeData skillTreeData, PrestigePlus prestigePlus, out FacilityRuntime runtime)
        {
            return TryBuildRuntime(facilityId?.Value, infinityData, prestigeData, skillTreeData, prestigePlus, out runtime);
        }

        /// <summary>
        /// Builds a facility runtime using a string facility ID (backward compatibility).
        /// </summary>
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

        /// <summary>
        /// Builds facility state using a strongly-typed facility ID asset.
        /// </summary>
        public static FacilityState BuildFacilityState(FacilityId facilityId, DysonVerseInfinityData infinityData)
        {
            return BuildFacilityState(facilityId?.Value, infinityData);
        }

        /// <summary>
        /// Builds facility state using a string facility ID (backward compatibility).
        /// </summary>
        public static FacilityState BuildFacilityState(string facilityId, DysonVerseInfinityData infinityData)
        {
            if (string.IsNullOrEmpty(facilityId) || infinityData == null) return null;

            if (!FacilityCountAccessor.TryGetCount(infinityData, facilityId, out var counts))
            {
                return null;
            }

            return new FacilityState
            {
                FacilityId = facilityId,
                ManualOwned = counts[1],
                AutoOwned = counts[0],
                EffectiveCount = counts[0] + counts[1]
            };
        }
    }
}

