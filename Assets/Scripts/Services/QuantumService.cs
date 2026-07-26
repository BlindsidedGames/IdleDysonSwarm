using System;
using Expansion;
using IdleDysonSwarm.Data;
using IdleDysonSwarm.Systems.Balance;
using UnityEngine;
using Systems.Numeric;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.QuantumConstants;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Default implementation of IQuantumService that wraps Oracle static access.
    /// Manages Quantum Points, upgrade purchases, and quantum leap operations.
    /// </summary>
    public sealed class QuantumService : IQuantumService
    {
        private readonly QuantumUpgradeDatabase _database;

        private PrestigePlus PrestigePlus => StaticSaveSettings.prestigePlus;
        private AvocadoData AvocadoData => StaticSaveSettings.avocadoData;
        private DysonVersePrestigeData PrestigeData => StaticPrestigeData;

        /// <summary>
        /// Creates a QuantumService with the specified upgrade database.
        /// </summary>
        /// <param name="database">The quantum upgrade database (can be null for fallback behavior).</param>
        public QuantumService(QuantumUpgradeDatabase database = null)
        {
            _database = database;
        }

        #region State Properties

        public long TotalPoints => PrestigePlus.points;
        public long AvailablePoints => PrestigePlus.points >= PrestigePlus.spentPoints
            ? PrestigePlus.points - PrestigePlus.spentPoints
            : 0L;
        public long SpentPoints => PrestigePlus.spentPoints;
        public long InfluenceSpeedLevel => PrestigePlus.influence;
        public long CashBonusLevel => PrestigePlus.cash;
        public long ScienceBonusLevel => PrestigePlus.science;
        public long PermanentSecrets => PrestigePlus.secrets;
        public long DivisionsPurchased => PrestigePlus.divisionsPurchased;

        #endregion

        #region Unlock State

        public bool IsBotMultitaskingUnlocked => PrestigePlus.botMultitasking;
        public bool IsDoubleIPUnlocked => PrestigePlus.doubleIP;
        public bool IsBreakTheLoopUnlocked => PrestigePlus.breakTheLoop;
        public bool IsQuantumEntanglementUnlocked => PrestigePlus.quantumEntanglement;
        public bool IsAutomationUnlocked => PrestigePlus.automation;
        public bool IsAvocadoUnlocked => AvocadoData.unlocked;
        public bool IsFragmentsUnlocked => PrestigePlus.fragments;
        public bool IsPurityUnlocked => PrestigePlus.purity;
        public bool IsTerraUnlocked => PrestigePlus.terra;
        public bool IsPowerUnlocked => PrestigePlus.power;
        public bool IsParagadeUnlocked => PrestigePlus.paragade;
        public bool IsStellarUnlocked => PrestigePlus.stellar;
        public bool IsMatrioshkaBrainsUnlocked => PrestigeData.unlockedMatrioshkaBrains;
        public bool IsBirchPlanetsUnlocked => PrestigeData.unlockedBirchPlanets;
        public bool IsGalacticBrainsUnlocked => PrestigeData.unlockedGalacticBrains;

        #endregion

        #region Calculations

        public int GetUpgradeCost(QuantumUpgradeType upgrade)
        {
            // Try database lookup first
            if (_database != null && _database.TryGet(upgrade.ToString(), out var definition))
            {
                int purchaseCount = GetPurchaseCount(upgrade);
                return definition.GetCostForPurchaseCount(purchaseCount);
            }

            // Fallback to constants for backward compatibility
            return GetUpgradeCostFallback(upgrade);
        }

        /// <summary>
        /// Gets the current purchase count for repeatable upgrades.
        /// </summary>
        private int GetPurchaseCount(QuantumUpgradeType upgrade)
        {
            return upgrade switch
            {
                QuantumUpgradeType.Division => ToBoundedPurchaseCount(DivisionsPurchased),
                QuantumUpgradeType.Secrets => ToBoundedPurchaseCount(PermanentSecrets / SecretsPerPurchase),
                QuantumUpgradeType.InfluenceSpeed => ToBoundedPurchaseCount(InfluenceSpeedLevel / InfluenceSpeedPerLevel),
                QuantumUpgradeType.CashBonus => ToBoundedPurchaseCount(CashBonusLevel),
                QuantumUpgradeType.ScienceBonus => ToBoundedPurchaseCount(ScienceBonusLevel),
                _ => IsUpgradePurchasedState(upgrade) ? 1 : 0
            };
        }

        /// <summary>
        /// Fallback cost calculation using constants (for when database is unavailable).
        /// </summary>
        private int GetUpgradeCostFallback(QuantumUpgradeType upgrade)
        {
            return upgrade switch
            {
                QuantumUpgradeType.BotMultitasking => BasicUpgradeCost,
                QuantumUpgradeType.DoubleIP => BasicUpgradeCost,
                QuantumUpgradeType.BreakTheLoop => BreakTheLoopCost,
                QuantumUpgradeType.QuantumEntanglement => QuantumEntanglementCost,
                QuantumUpgradeType.Automation => BasicUpgradeCost,
                QuantumUpgradeType.Secrets => BasicUpgradeCost,
                QuantumUpgradeType.Division => CalculateDivisionCost(),
                QuantumUpgradeType.Avocado => AvocadoCost,
                QuantumUpgradeType.Fragments => FragmentCost,
                QuantumUpgradeType.Purity => PurityCost,
                QuantumUpgradeType.Terra => TerraCost,
                QuantumUpgradeType.Power => PowerCost,
                QuantumUpgradeType.Paragade => ParagadeCost,
                QuantumUpgradeType.Stellar => StellarCost,
                QuantumUpgradeType.InfluenceSpeed => BasicUpgradeCost,
                QuantumUpgradeType.CashBonus => BasicUpgradeCost,
                QuantumUpgradeType.ScienceBonus => BasicUpgradeCost,
                QuantumUpgradeType.MatrioshkaBrains => MatrioshkaBrainsCost,
                QuantumUpgradeType.BirchPlanets => BirchPlanetsCost,
                QuantumUpgradeType.GalacticBrains => GalacticBrainsCost,
                _ => int.MaxValue
            };
        }

        /// <summary>
        /// Division cost scales exponentially: 2^n * 2
        /// </summary>
        private int CalculateDivisionCost()
        {
            if (DivisionsPurchased >= 19) return int.MaxValue;
            return DivisionsPurchased >= 1
                ? (int)(2L << (int)DivisionsPurchased)
                : 2;
        }

        private static int ToBoundedPurchaseCount(long value)
        {
            return value <= 0L ? 0 : value >= int.MaxValue ? int.MaxValue : (int)value;
        }

        public bool CanAfford(QuantumUpgradeType upgrade)
        {
            return AvailablePoints >= GetUpgradeCost(upgrade);
        }

        public bool IsUpgradePurchased(QuantumUpgradeType upgrade)
        {
            // Try database lookup for repeatability/max purchases
            if (_database != null && _database.TryGet(upgrade.ToString(), out var definition))
            {
                int purchaseCount = GetPurchaseCount(upgrade);
                return !definition.CanPurchaseMore(purchaseCount);
            }

            // Fallback to hardcoded checks
            return IsUpgradePurchasedFallback(upgrade);
        }

        /// <summary>
        /// Gets whether a specific upgrade is in the "unlocked" state.
        /// Used for one-time unlocks to determine purchase count.
        /// </summary>
        private bool IsUpgradePurchasedState(QuantumUpgradeType upgrade)
        {
            return upgrade switch
            {
                QuantumUpgradeType.BotMultitasking => IsBotMultitaskingUnlocked,
                QuantumUpgradeType.DoubleIP => IsDoubleIPUnlocked,
                QuantumUpgradeType.BreakTheLoop => IsBreakTheLoopUnlocked,
                QuantumUpgradeType.QuantumEntanglement => IsQuantumEntanglementUnlocked,
                QuantumUpgradeType.Automation => IsAutomationUnlocked,
                QuantumUpgradeType.Avocado => IsAvocadoUnlocked,
                QuantumUpgradeType.Fragments => IsFragmentsUnlocked,
                QuantumUpgradeType.Purity => IsPurityUnlocked,
                QuantumUpgradeType.Terra => IsTerraUnlocked,
                QuantumUpgradeType.Power => IsPowerUnlocked,
                QuantumUpgradeType.Paragade => IsParagadeUnlocked,
                QuantumUpgradeType.Stellar => IsStellarUnlocked,
                QuantumUpgradeType.MatrioshkaBrains => IsMatrioshkaBrainsUnlocked,
                QuantumUpgradeType.BirchPlanets => IsBirchPlanetsUnlocked,
                QuantumUpgradeType.GalacticBrains => IsGalacticBrainsUnlocked,
                _ => false
            };
        }

        /// <summary>
        /// Fallback purchased check (for when database is unavailable).
        /// </summary>
        private bool IsUpgradePurchasedFallback(QuantumUpgradeType upgrade)
        {
            return upgrade switch
            {
                QuantumUpgradeType.BotMultitasking => IsBotMultitaskingUnlocked,
                QuantumUpgradeType.DoubleIP => IsDoubleIPUnlocked,
                QuantumUpgradeType.BreakTheLoop => IsBreakTheLoopUnlocked,
                QuantumUpgradeType.QuantumEntanglement => IsQuantumEntanglementUnlocked,
                QuantumUpgradeType.Automation => IsAutomationUnlocked,
                QuantumUpgradeType.Secrets => PermanentSecrets >= MaxSecrets,
                QuantumUpgradeType.Division => DivisionsPurchased >= 19, // Max divisions
                QuantumUpgradeType.Avocado => IsAvocadoUnlocked,
                QuantumUpgradeType.Fragments => IsFragmentsUnlocked,
                QuantumUpgradeType.Purity => IsPurityUnlocked,
                QuantumUpgradeType.Terra => IsTerraUnlocked,
                QuantumUpgradeType.Power => IsPowerUnlocked,
                QuantumUpgradeType.Paragade => IsParagadeUnlocked,
                QuantumUpgradeType.Stellar => IsStellarUnlocked,
                QuantumUpgradeType.MatrioshkaBrains => IsMatrioshkaBrainsUnlocked,
                QuantumUpgradeType.BirchPlanets => IsBirchPlanetsUnlocked,
                QuantumUpgradeType.GalacticBrains => IsGalacticBrainsUnlocked,
                // Repeatable upgrades are never "purchased" (always available)
                QuantumUpgradeType.InfluenceSpeed => false,
                QuantumUpgradeType.CashBonus => false,
                QuantumUpgradeType.ScienceBonus => false,
                _ => false
            };
        }

        public int CalculatedWorkerSpeed
        {
            get
            {
                long speed = NumericSafety.Add(
                    (long)BalanceRuntime.BaseWorkerGenerationSpeed,
                    InfluenceSpeedLevel).Value;
                return speed >= int.MaxValue ? int.MaxValue : (int)speed;
            }
        }

        public double CashMultiplier => 1 + (CashBonusLevel * CashBonusPerPoint);

        public double ScienceMultiplier => 1 + (ScienceBonusLevel * ScienceBonusPerPoint);

        #endregion

        #region Actions

        public bool TryPurchaseUpgrade(QuantumUpgradeType upgrade)
        {
            // Check if already purchased (for one-time unlocks)
            if (IsUpgradePurchased(upgrade))
                return false;

            // Check affordability
            if (!CanAfford(upgrade))
                return false;

            int cost = GetUpgradeCost(upgrade);
            DiscreteDebitResult debit = EconomyTransaction.TryDebit(AvailablePoints, cost);
            if (!debit.Succeeded) return false;
            NumericResult<long> spent = NumericSafety.Add(PrestigePlus.spentPoints, debit.Charged);
            if (!spent.IsSuccess) return false;

            // Apply upgrade
            bool success = ApplyUpgrade(upgrade);
            if (!success)
                return false;

            // Spend points
            PrestigePlus.spentPoints = spent.Value;

            // Fire event
            OnUpgradePurchased?.Invoke(upgrade);

            return true;
        }

        private bool ApplyUpgrade(QuantumUpgradeType upgrade)
        {
            switch (upgrade)
            {
                case QuantumUpgradeType.BotMultitasking:
                    PrestigePlus.botMultitasking = true;
                    return true;

                case QuantumUpgradeType.DoubleIP:
                    PrestigePlus.doubleIP = true;
                    return true;

                case QuantumUpgradeType.BreakTheLoop:
                    PrestigePlus.breakTheLoop = true;
                    return true;

                case QuantumUpgradeType.QuantumEntanglement:
                    PrestigePlus.quantumEntanglement = true;
                    return true;

                case QuantumUpgradeType.Automation:
                    PrestigePlus.automation = true;
                    // Also sets automation flags on PrestigeData
                    PrestigeData.infinityAutoBots = true;
                    PrestigeData.infinityAutoResearch = true;
                    return true;

                case QuantumUpgradeType.Secrets:
                    if (PermanentSecrets >= MaxSecrets)
                        return false;
                    // Add 3 secrets to both permanent and session storage (capped at 27)
                    PrestigePlus.secrets = NumericSafety.Add(PrestigePlus.secrets, SecretsPerPurchase).Value;
                    if (PrestigePlus.secrets > MaxSecrets)
                        PrestigePlus.secrets = MaxSecrets;
                    PrestigeData.secretsOfTheUniverse =
                        NumericSafety.Add(PrestigeData.secretsOfTheUniverse, SecretsPerPurchase).Value;
                    if (PrestigeData.secretsOfTheUniverse > MaxSecrets)
                        PrestigeData.secretsOfTheUniverse = MaxSecrets;
                    return true;

                case QuantumUpgradeType.Division:
                    if (DivisionsPurchased >= 19)
                        return false;
                    PrestigePlus.divisionsPurchased =
                        NumericSafety.Add(PrestigePlus.divisionsPurchased, 1L).Value;
                    return true;

                case QuantumUpgradeType.Avocado:
                    AvocadoData.unlocked = true;
                    PrestigePlus.avocatoPurchased = true; // Keep legacy field in sync
                    return true;

                case QuantumUpgradeType.Fragments:
                    PrestigePlus.fragments = true;
                    return true;

                case QuantumUpgradeType.Purity:
                    PrestigePlus.purity = true;
                    return true;

                case QuantumUpgradeType.Terra:
                    PrestigePlus.terra = true;
                    return true;

                case QuantumUpgradeType.Power:
                    PrestigePlus.power = true;
                    return true;

                case QuantumUpgradeType.Paragade:
                    PrestigePlus.paragade = true;
                    return true;

                case QuantumUpgradeType.Stellar:
                    PrestigePlus.stellar = true;
                    return true;

                case QuantumUpgradeType.InfluenceSpeed:
                {
                    NumericResult<long> influence =
                        NumericSafety.Add(PrestigePlus.influence, InfluenceSpeedPerLevel);
                    if (!influence.IsSuccess || influence.Value <= PrestigePlus.influence) return false;
                    PrestigePlus.influence = influence.Value;
                    return true;
                }

                case QuantumUpgradeType.CashBonus:
                {
                    NumericResult<long> cash = NumericSafety.Add(PrestigePlus.cash, 1L);
                    if (!cash.IsSuccess || cash.Value <= PrestigePlus.cash) return false;
                    PrestigePlus.cash = cash.Value;
                    return true;
                }

                case QuantumUpgradeType.ScienceBonus:
                {
                    NumericResult<long> science = NumericSafety.Add(PrestigePlus.science, 1L);
                    if (!science.IsSuccess || science.Value <= PrestigePlus.science) return false;
                    PrestigePlus.science = science.Value;
                    return true;
                }

                case QuantumUpgradeType.MatrioshkaBrains:
                    PrestigeData.unlockedMatrioshkaBrains = true;
                    return true;

                case QuantumUpgradeType.BirchPlanets:
                    PrestigeData.unlockedBirchPlanets = true;
                    return true;

                case QuantumUpgradeType.GalacticBrains:
                    PrestigeData.unlockedGalacticBrains = true;
                    return true;

                default:
                    return false;
            }
        }

        #endregion

        #region Events

        public event Action<QuantumUpgradeType> OnUpgradePurchased;
        public event Action<long> OnQuantumPointsEarned;

        /// <summary>
        /// Called externally when quantum points are earned (e.g., after a Quantum Leap).
        /// </summary>
        internal void NotifyQuantumPointsEarned(long amount)
        {
            OnQuantumPointsEarned?.Invoke(amount);
        }

        #endregion
    }
}
