using GameData;
using IdleDysonSwarm.Data;
using Systems.Facilities;
using UnityEngine;

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

            if (!FacilityCountAccessor.TrySetCount(infinityData, facilityId, auto, manual))
            {
                Debug.LogWarning($"Failed to set facility count for '{facilityId}'");
            }
        }

        public double[] GetFacilityCount(string facilityId)
        {
            var infinityData = _gameState.InfinityData;

            if (FacilityCountAccessor.TryGetCount(infinityData, facilityId, out var counts))
            {
                return counts;
            }

            return new double[2]; // Default: [0, 0]
        }
    }
}
