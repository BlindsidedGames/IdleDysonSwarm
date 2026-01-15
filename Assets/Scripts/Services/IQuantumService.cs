using System;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Defines upgrade types available in the Quantum Leap system.
    /// </summary>
    public enum QuantumUpgradeType
    {
        BotMultitasking,
        DoubleIP,
        BreakTheLoop,
        QuantumEntanglement,
        Automation,
        Secrets,
        Division,
        Avocado,
        Fragments,
        Purity,
        Terra,
        Power,
        Paragade,
        Stellar,
        InfluenceSpeed,
        CashBonus,
        ScienceBonus,
        // Mega-structure unlocks
        MatrioshkaBrains,
        BirchPlanets,
        GalacticBrains
    }

    /// <summary>
    /// Service interface for the Quantum Leap system.
    /// Manages Quantum Points, upgrade purchases, and quantum leap operations.
    /// </summary>
    /// <remarks>
    /// The Quantum Leap system converts 42 Infinity Points into 1 Quantum Point.
    /// Quantum Points are spent on upgrades affecting Infinity mechanics.
    /// </remarks>
    public interface IQuantumService
    {
        #region State Properties

        /// <summary>
        /// Total Quantum Points ever earned.
        /// </summary>
        long TotalPoints { get; }

        /// <summary>
        /// Quantum Points available to spend (Total - Spent).
        /// </summary>
        long AvailablePoints { get; }

        /// <summary>
        /// Quantum Points spent on upgrades.
        /// </summary>
        long SpentPoints { get; }

        /// <summary>
        /// Current Influence Speed bonus (already scaled).
        /// This is the raw bonus added to base worker generation speed.
        /// Each purchase adds +4 (InfluenceSpeedPerLevel) to this value.
        /// </summary>
        long InfluenceSpeedLevel { get; }

        /// <summary>
        /// Current Cash Bonus upgrade level.
        /// Each level adds +5% cash multiplier.
        /// </summary>
        long CashBonusLevel { get; }

        /// <summary>
        /// Current Science Bonus upgrade level.
        /// Each level adds +5% science multiplier.
        /// </summary>
        long ScienceBonusLevel { get; }

        /// <summary>
        /// Permanent secrets purchased (0-27, adds +3 per purchase).
        /// </summary>
        long PermanentSecrets { get; }

        /// <summary>
        /// Number of Division upgrades purchased.
        /// Each provides 10x multiplier; cost scales exponentially (2^n * 2).
        /// </summary>
        long DivisionsPurchased { get; }

        #endregion

        #region Unlock State

        /// <summary>
        /// Whether Bot Multitasking is unlocked.
        /// </summary>
        bool IsBotMultitaskingUnlocked { get; }

        /// <summary>
        /// Whether Double IP is unlocked.
        /// </summary>
        bool IsDoubleIPUnlocked { get; }

        /// <summary>
        /// Whether Break The Loop (DysonVerse upgrade) is unlocked.
        /// </summary>
        bool IsBreakTheLoopUnlocked { get; }

        /// <summary>
        /// Whether Quantum Entanglement (auto-prestige at 42 IP) is unlocked.
        /// </summary>
        bool IsQuantumEntanglementUnlocked { get; }

        /// <summary>
        /// Whether Automation is unlocked.
        /// </summary>
        bool IsAutomationUnlocked { get; }

        /// <summary>
        /// Whether Avocado system is unlocked.
        /// </summary>
        bool IsAvocadoUnlocked { get; }

        /// <summary>
        /// Whether Fragments upgrade is unlocked.
        /// </summary>
        bool IsFragmentsUnlocked { get; }

        /// <summary>
        /// Whether Purity upgrade is unlocked.
        /// </summary>
        bool IsPurityUnlocked { get; }

        /// <summary>
        /// Whether Terra upgrade is unlocked.
        /// </summary>
        bool IsTerraUnlocked { get; }

        /// <summary>
        /// Whether Power upgrade is unlocked.
        /// </summary>
        bool IsPowerUnlocked { get; }

        /// <summary>
        /// Whether Paragade upgrade is unlocked.
        /// </summary>
        bool IsParagadeUnlocked { get; }

        /// <summary>
        /// Whether Stellar upgrade is unlocked.
        /// </summary>
        bool IsStellarUnlocked { get; }

        /// <summary>
        /// Whether Matrioshka Brains mega-structure is unlocked.
        /// </summary>
        bool IsMatrioshkaBrainsUnlocked { get; }

        /// <summary>
        /// Whether Birch Planets mega-structure is unlocked.
        /// </summary>
        bool IsBirchPlanetsUnlocked { get; }

        /// <summary>
        /// Whether Galactic Brains mega-structure is unlocked.
        /// </summary>
        bool IsGalacticBrainsUnlocked { get; }

        #endregion

        #region Calculations

        /// <summary>
        /// Gets the cost in Quantum Points for a specific upgrade.
        /// </summary>
        /// <param name="upgrade">The upgrade type to check.</param>
        /// <returns>The cost in Quantum Points.</returns>
        int GetUpgradeCost(QuantumUpgradeType upgrade);

        /// <summary>
        /// Checks if the player can afford a specific upgrade.
        /// </summary>
        /// <param name="upgrade">The upgrade type to check.</param>
        /// <returns>True if affordable, false otherwise.</returns>
        bool CanAfford(QuantumUpgradeType upgrade);

        /// <summary>
        /// Checks if an upgrade is already purchased (for one-time unlocks).
        /// </summary>
        /// <param name="upgrade">The upgrade type to check.</param>
        /// <returns>True if already purchased.</returns>
        bool IsUpgradePurchased(QuantumUpgradeType upgrade);

        /// <summary>
        /// Gets the calculated worker generation speed.
        /// Formula: BaseWorkerGenerationSpeed + InfluenceSpeedLevel
        /// </summary>
        int CalculatedWorkerSpeed { get; }

        /// <summary>
        /// Gets the current cash bonus multiplier based on CashBonusLevel.
        /// Formula: 1 + (CashBonusLevel * CashBonusPerPoint)
        /// </summary>
        double CashMultiplier { get; }

        /// <summary>
        /// Gets the current science bonus multiplier based on ScienceBonusLevel.
        /// Formula: 1 + (ScienceBonusLevel * ScienceBonusPerPoint)
        /// </summary>
        double ScienceMultiplier { get; }

        #endregion

        #region Actions

        /// <summary>
        /// Attempts to purchase an upgrade.
        /// </summary>
        /// <param name="upgrade">The upgrade to purchase.</param>
        /// <returns>True if purchase succeeded, false otherwise.</returns>
        bool TryPurchaseUpgrade(QuantumUpgradeType upgrade);

        #endregion

        #region Events

        /// <summary>
        /// Fired when an upgrade is successfully purchased.
        /// </summary>
        event Action<QuantumUpgradeType> OnUpgradePurchased;

        /// <summary>
        /// Fired when Quantum Points are earned (after a Quantum Leap).
        /// Parameter is the number of points earned.
        /// </summary>
        event Action<long> OnQuantumPointsEarned;

        #endregion
    }
}
