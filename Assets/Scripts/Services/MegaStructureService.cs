using Blindsided.Utilities;
using GameData;
using IdleDysonSwarm.Data.Balance;
using IdleDysonSwarm.Systems.Balance;
using Systems.Debugging;
using Systems.Numeric;
using UnityEngine;
using static Expansion.Oracle;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Service for handling mega-structure facility purchases.
    /// Mega-structures use cash purchase flow while retaining quantum unlock gates.
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
            if (BalanceRuntime.TryGetFacilityEntry(facilityId, out var entry))
                return entry.group == FacilityGroup.Mega;

            return facilityId == "matrioshka_brains" || facilityId == "birch_planets" || facilityId == "galactic_brains";
        }

        public bool IsUnlocked(string facilityId)
        {
            if (!IsMegaStructure(facilityId))
                return true;

            DysonVersePrestigeData prestigeData = _gameState.PrestigeData;
            if (prestigeData == null) return false;

            QuantumMegaUnlockGate gate = QuantumMegaUnlockGate.None;
            string prerequisiteId = null;
            double prerequisiteOwned = 0;
            if (BalanceRuntime.TryGetFacilityEntry(facilityId, out var entry))
            {
                gate = entry.quantumGate;
                prerequisiteId = entry.prerequisiteFacilityId;
                prerequisiteOwned = entry.prerequisiteOwned;
            }
            else
            {
                gate = facilityId switch
                {
                    "matrioshka_brains" => QuantumMegaUnlockGate.MatrioshkaBrains,
                    "birch_planets" => QuantumMegaUnlockGate.BirchPlanets,
                    "galactic_brains" => QuantumMegaUnlockGate.GalacticBrains,
                    _ => QuantumMegaUnlockGate.None
                };
            }

            if (!BalanceRuntime.IsQuantumGateUnlocked(gate, prestigeData))
                return false;

            if (string.IsNullOrEmpty(prerequisiteId))
            {
                return facilityId switch
                {
                    "matrioshka_brains" => GetTotalOwned("planets") > 0,
                    "birch_planets" => GetTotalOwned("matrioshka_brains") > 0,
                    "galactic_brains" => GetTotalOwned("birch_planets") > 0,
                    _ => true
                };
            }

            return GetTotalOwned(prerequisiteId) >= prerequisiteOwned;
        }

        public double GetCost(string facilityId, int quantity = 1)
        {
            if (!_dataService.TryGetFacility(facilityId, out FacilityDefinition definition))
                return 0;

            if (quantity <= 0)
                return 0;

            double currentOwned = GetManualOwned(facilityId);
            return CalcUtils.BuyXCost(quantity, definition.baseCost, definition.costExponent, currentOwned);
        }

        public bool CanAfford(string facilityId, int quantity = 1)
        {
            if (quantity <= 0)
                return false;

            if (!IsUnlocked(facilityId))
                return false;

            double cost = GetCost(facilityId, quantity);
            double money = _gameState.InfinityData != null ? _gameState.InfinityData.money : 0;
            return money >= cost;
        }

        public int MaxAffordable(string facilityId)
        {
            if (!_dataService.TryGetFacility(facilityId, out FacilityDefinition definition))
                return 0;

            double money = _gameState.InfinityData != null ? _gameState.InfinityData.money : 0;
            double currentOwned = GetManualOwned(facilityId);
            long max = CalcUtils.MaxAffordableLong(money, definition.baseCost, definition.costExponent, currentOwned);
            return max <= 0 ? 0 : max > int.MaxValue ? int.MaxValue : (int)max;
        }

        public bool TryPurchase(string facilityId, int quantity = 1)
        {
            if (quantity <= 0)
                return false;

            DysonVerseInfinityData infinity = _gameState.InfinityData;
            if (infinity == null)
                return false;

            double cost = GetCost(facilityId, quantity);
            double[] currentCounts = _facilityService.GetFacilityCount(facilityId);
            if (currentCounts == null || currentCounts.Length < 2)
                return false;

            NumericResult<double> nextManual = NumericSafety.Add(currentCounts[1], quantity);
            if (!nextManual.IsSuccess || nextManual.Value <= currentCounts[1])
                return false;

            DebitResult debit = EconomyTransaction.TryDebit(infinity.money, cost, quantity);
            if (!debit.Succeeded)
            {
                if (debit.Status != TransactionStatus.InsufficientFunds &&
                    debit.Status != TransactionStatus.InvalidQuantity)
                {
                    NumericDiagnostics.Report("NS-TRANSACTION-MEGA", $"status={debit.Status}");
                }
                return false;
            }

            infinity.money = debit.Balance;
            _facilityService.SetFacilityCount(facilityId, nextManual.Value, currentCounts[0]);

            Debug.Log($"[MegaStructure] Purchased {quantity} {facilityId} for ${CalcUtils.FormatNumber(cost)}.");
            return true;
        }

        private double GetTotalOwned(string facilityId)
        {
            double[] counts = _facilityService.GetFacilityCount(facilityId);
            return counts[0] + counts[1];
        }

        private double GetManualOwned(string facilityId)
        {
            double[] counts = _facilityService.GetFacilityCount(facilityId);
            return counts[1];
        }
    }
}
