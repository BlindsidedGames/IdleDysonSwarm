using System;
using Expansion;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.QuantumConstants;
using static IdleDysonSwarm.Systems.Constants.RealityConstants;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Default implementation of IQuantumService that wraps Oracle static access.
    /// Manages Quantum Points, upgrade purchases, and quantum leap operations.
    /// </summary>
    public sealed class QuantumService : IQuantumService
    {
        private PrestigePlus PrestigePlus => StaticSaveSettings.prestigePlus;
        private AvocadoData AvocadoData => StaticSaveSettings.avocadoData;
        private DysonVersePrestigeData PrestigeData => StaticPrestigeData;

        #region State Properties

        public long TotalPoints => PrestigePlus.points;
        public long AvailablePoints => PrestigePlus.points - PrestigePlus.spentPoints;
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
        public bool IsAvocadoUnlocked => PrestigePlus.avocatoPurchased;
        public bool IsFragmentsUnlocked => PrestigePlus.fragments;
        public bool IsPurityUnlocked => PrestigePlus.purity;
        public bool IsTerraUnlocked => PrestigePlus.terra;
        public bool IsPowerUnlocked => PrestigePlus.power;
        public bool IsParagadeUnlocked => PrestigePlus.paragade;
        public bool IsStellarUnlocked => PrestigePlus.stellar;

        #endregion

        #region Calculations

        public int GetUpgradeCost(QuantumUpgradeType upgrade)
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
                _ => int.MaxValue
            };
        }

        /// <summary>
        /// Division cost scales exponentially: 2^n * 2
        /// </summary>
        private int CalculateDivisionCost()
        {
            if (DivisionsPurchased >= 1)
            {
                return (int)Math.Pow(2, DivisionsPurchased) * 2;
            }
            return 2;
        }

        public bool CanAfford(QuantumUpgradeType upgrade)
        {
            return AvailablePoints >= GetUpgradeCost(upgrade);
        }

        public bool IsUpgradePurchased(QuantumUpgradeType upgrade)
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
                // Repeatable upgrades are never "purchased" (always available)
                QuantumUpgradeType.InfluenceSpeed => false,
                QuantumUpgradeType.CashBonus => false,
                QuantumUpgradeType.ScienceBonus => false,
                _ => false
            };
        }

        public int CalculatedWorkerSpeed => BaseWorkerGenerationSpeed + (int)InfluenceSpeedLevel;

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

            // Apply upgrade
            bool success = ApplyUpgrade(upgrade);
            if (!success)
                return false;

            // Spend points
            PrestigePlus.spentPoints += cost;

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
                    PrestigePlus.secrets += SecretsPerPurchase;
                    if (PrestigePlus.secrets > MaxSecrets)
                        PrestigePlus.secrets = MaxSecrets;
                    PrestigeData.secretsOfTheUniverse += SecretsPerPurchase;
                    if (PrestigeData.secretsOfTheUniverse > MaxSecrets)
                        PrestigeData.secretsOfTheUniverse = MaxSecrets;
                    return true;

                case QuantumUpgradeType.Division:
                    if (DivisionsPurchased >= 19)
                        return false;
                    PrestigePlus.divisionsPurchased++;
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
                    PrestigePlus.influence += InfluenceSpeedPerLevel;
                    return true;

                case QuantumUpgradeType.CashBonus:
                    PrestigePlus.cash++;
                    return true;

                case QuantumUpgradeType.ScienceBonus:
                    PrestigePlus.science++;
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
