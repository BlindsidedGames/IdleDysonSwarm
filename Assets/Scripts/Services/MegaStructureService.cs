using Blindsided.Utilities;
using GameData;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Service for handling mega-structure facility purchases.
    /// Mega-structures cost other facilities instead of currency.
    /// </summary>
    public class MegaStructureService : IMegaStructureService
    {
        private readonly IGameStateService _gameState;
        private readonly IFacilityService _facilityService;
        private readonly IGameDataService _dataService;

        public MegaStructureService(
            IGameStateService gameState,
            IFacilityService facilityService,
            IGameDataService dataService)
        {
            _gameState = gameState;
            _facilityService = facilityService;
            _dataService = dataService;
        }

        public bool IsMegaStructure(string facilityId)
        {
            if (!_dataService.TryGetFacility(facilityId, out FacilityDefinition definition))
                return false;

            return definition.usesFacilityCost;
        }

        public bool IsUnlocked(string facilityId)
        {
            DysonVersePrestigeData prestigeData = _gameState.PrestigeData;
            if (prestigeData == null) return false;

            return facilityId switch
            {
                "matrioshka_brains" => prestigeData.unlockedMatrioshkaBrains,
                "birch_planets" => prestigeData.unlockedBirchPlanets,
                "galactic_brains" => prestigeData.unlockedGalacticBrains,
                _ => false
            };
        }

        public string GetCostFacilityId(string facilityId)
        {
            if (!_dataService.TryGetFacility(facilityId, out FacilityDefinition definition))
                return null;

            if (!definition.usesFacilityCost || definition.costFacilityId == null)
                return null;

            return definition.costFacilityId.Value;
        }

        public string GetSecondaryCostFacilityId(string facilityId)
        {
            if (!_dataService.TryGetFacility(facilityId, out FacilityDefinition definition))
                return null;

            if (definition.secondaryCostFacilityId == null)
                return null;

            return definition.secondaryCostFacilityId.Value;
        }

        public double GetCost(string facilityId, int quantity = 1)
        {
            if (!_dataService.TryGetFacility(facilityId, out FacilityDefinition definition))
                return 0;

            if (!definition.usesFacilityCost)
                return 0;

            double currentOwned = GetTotalOwned(facilityId);

            return CalcUtils.FacilityCost(
                quantity,
                definition.baseFacilityCost,
                definition.facilityCostExponent,
                currentOwned);
        }

        public double GetSecondaryCost(string facilityId, int quantity = 1)
        {
            if (!_dataService.TryGetFacility(facilityId, out FacilityDefinition definition))
                return 0;

            if (definition.secondaryCostFacilityId == null ||
                string.IsNullOrEmpty(definition.secondaryCostFacilityId.Value))
                return 0;

            double currentOwned = GetTotalOwned(facilityId);

            return CalcUtils.FacilityCost(
                quantity,
                definition.secondaryBaseCost,
                definition.secondaryCostExponent,
                currentOwned);
        }

        public bool CanAfford(string facilityId, int quantity = 1)
        {
            if (!_dataService.TryGetFacility(facilityId, out FacilityDefinition definition))
                return false;

            if (!definition.usesFacilityCost)
                return false;

            // Check primary cost
            string costFacilityId = definition.costFacilityId?.Value;
            if (string.IsNullOrEmpty(costFacilityId))
                return false;

            double primaryCost = GetCost(facilityId, quantity);
            double availablePrimary = GetTotalOwned(costFacilityId);

            if (availablePrimary < primaryCost)
                return false;

            // Check secondary cost (if any)
            if (definition.secondaryCostFacilityId != null &&
                !string.IsNullOrEmpty(definition.secondaryCostFacilityId.Value))
            {
                double secondaryCost = GetSecondaryCost(facilityId, quantity);
                double availableSecondary = GetTotalOwned(definition.secondaryCostFacilityId.Value);

                if (availableSecondary < secondaryCost)
                    return false;
            }

            return true;
        }

        public int MaxAffordable(string facilityId)
        {
            if (!_dataService.TryGetFacility(facilityId, out FacilityDefinition definition))
                return 0;

            if (!definition.usesFacilityCost)
                return 0;

            string costFacilityId = definition.costFacilityId?.Value;
            if (string.IsNullOrEmpty(costFacilityId))
                return 0;

            double currentOwned = GetTotalOwned(facilityId);
            double availablePrimary = GetTotalOwned(costFacilityId);

            int maxFromPrimary = CalcUtils.MaxAffordableFacility(
                availablePrimary,
                definition.baseFacilityCost,
                definition.facilityCostExponent,
                currentOwned);

            // Check secondary cost constraint
            if (definition.secondaryCostFacilityId != null &&
                !string.IsNullOrEmpty(definition.secondaryCostFacilityId.Value))
            {
                double availableSecondary = GetTotalOwned(definition.secondaryCostFacilityId.Value);

                int maxFromSecondary = CalcUtils.MaxAffordableFacility(
                    availableSecondary,
                    definition.secondaryBaseCost,
                    definition.secondaryCostExponent,
                    currentOwned);

                // Return the minimum of both constraints
                return maxFromPrimary < maxFromSecondary ? maxFromPrimary : maxFromSecondary;
            }

            return maxFromPrimary;
        }

        public bool TryPurchase(string facilityId, int quantity = 1)
        {
            if (quantity <= 0)
                return false;

            if (!_dataService.TryGetFacility(facilityId, out FacilityDefinition definition))
                return false;

            if (!definition.usesFacilityCost)
                return false;

            if (!CanAfford(facilityId, quantity))
                return false;

            // Deduct primary cost
            string costFacilityId = definition.costFacilityId.Value;
            double primaryCost = GetCost(facilityId, quantity);

            double[] costFacilityBefore = _facilityService.GetFacilityCount(costFacilityId);
            Debug.Log($"[MegaStructure] Purchasing {quantity} {facilityId}, cost: {primaryCost} {costFacilityId}");
            Debug.Log($"[MegaStructure] {costFacilityId} before: auto={costFacilityBefore[0]}, manual={costFacilityBefore[1]}");

            DeductFacilityCost(costFacilityId, primaryCost);

            double[] costFacilityAfter = _facilityService.GetFacilityCount(costFacilityId);
            Debug.Log($"[MegaStructure] {costFacilityId} after: auto={costFacilityAfter[0]}, manual={costFacilityAfter[1]}");

            // Deduct secondary cost (if any)
            if (definition.secondaryCostFacilityId != null &&
                !string.IsNullOrEmpty(definition.secondaryCostFacilityId.Value))
            {
                double secondaryCost = GetSecondaryCost(facilityId, quantity);
                DeductFacilityCost(definition.secondaryCostFacilityId.Value, secondaryCost);
            }

            // Add purchased mega-structure
            double[] currentCounts = _facilityService.GetFacilityCount(facilityId);
            _facilityService.SetFacilityCount(facilityId, currentCounts[1] + quantity, currentCounts[0]);

            Debug.Log($"[MegaStructure] Purchase complete. {facilityId} now: manual={currentCounts[1] + quantity}");

            return true;
        }

        private double GetTotalOwned(string facilityId)
        {
            double[] counts = _facilityService.GetFacilityCount(facilityId);
            return counts[0] + counts[1];
        }

        private void DeductFacilityCost(string facilityId, double amount)
        {
            if (amount <= 0) return;

            double[] counts = _facilityService.GetFacilityCount(facilityId);

            // Deduct from auto-purchased first, then manual
            if (counts[0] >= amount)
            {
                _facilityService.SetFacilityCount(facilityId, counts[1], counts[0] - amount);
            }
            else
            {
                double manualDeduct = amount - counts[0];
                _facilityService.SetFacilityCount(facilityId, counts[1] - manualDeduct, 0);
            }
        }
    }
}
