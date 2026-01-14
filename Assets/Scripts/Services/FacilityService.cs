using GameData;
using IdleDysonSwarm.Data;
using Systems.Facilities;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Default implementation of IFacilityService.
    /// Provides facility management operations using FacilityRuntimeBuilder.
    /// </summary>
    public sealed class FacilityService : IFacilityService
    {
        private readonly IGameStateService _gameState;

        public FacilityService(IGameStateService gameState)
        {
            _gameState = gameState;
        }

        public bool TryGetFacilityRuntime(string facilityId, out FacilityRuntime runtime)
        {
            return FacilityRuntimeBuilder.TryBuildRuntime(
                facilityId,
                _gameState.InfinityData,
                _gameState.PrestigeData,
                _gameState.SkillTreeData,
                _gameState.PrestigePlus,
                out runtime
            );
        }

        public bool TryGetFacilityRuntime(FacilityId facilityId, out FacilityRuntime runtime)
        {
            return FacilityRuntimeBuilder.TryBuildRuntime(
                facilityId,
                _gameState.InfinityData,
                _gameState.PrestigeData,
                _gameState.SkillTreeData,
                _gameState.PrestigePlus,
                out runtime
            );
        }

        public FacilityState GetFacilityState(string facilityId)
        {
            if (TryGetFacilityRuntime(facilityId, out var runtime))
            {
                return runtime.State;
            }
            return null;
        }

        public FacilityState GetFacilityState(FacilityId facilityId)
        {
            if (TryGetFacilityRuntime(facilityId, out var runtime))
            {
                return runtime.State;
            }
            return null;
        }

        public void SetFacilityCount(string facilityId, double manual, double auto)
        {
            var infinityData = _gameState.InfinityData;

            // Map facility ID to array field
            switch (facilityId)
            {
                case "assembly_lines":
                    infinityData.assemblyLines[0] = auto;
                    infinityData.assemblyLines[1] = manual;
                    break;
                case "ai_managers":
                    infinityData.managers[0] = auto;
                    infinityData.managers[1] = manual;
                    break;
                case "servers":
                    infinityData.servers[0] = auto;
                    infinityData.servers[1] = manual;
                    break;
                case "data_centers":
                    infinityData.dataCenters[0] = auto;
                    infinityData.dataCenters[1] = manual;
                    break;
                case "planets":
                    infinityData.planets[0] = auto;
                    infinityData.planets[1] = manual;
                    break;
            }
        }

        public double[] GetFacilityCount(string facilityId)
        {
            var infinityData = _gameState.InfinityData;

            // Map facility ID to array field
            return facilityId switch
            {
                "assembly_lines" => infinityData.assemblyLines,
                "ai_managers" => infinityData.managers,
                "servers" => infinityData.servers,
                "data_centers" => infinityData.dataCenters,
                "planets" => infinityData.planets,
                _ => new double[2] // Default: [0, 0]
            };
        }
    }
}
