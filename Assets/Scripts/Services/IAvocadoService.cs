using System;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Service interface for the Avocado cross-system aggregator.
    /// Avocado consumes resources from Infinity, Reality, and Dream1 systems
    /// to produce a global production multiplier.
    /// </summary>
    /// <remarks>
    /// Avocado is unlocked by spending 42 Quantum Points.
    /// The global buff is calculated as:
    /// Log10(IP) × Log10(Influence) × Log10(StrangeMatter) × (1 + Overflow)
    /// Each component only contributes if its value is >= 10 (AvocadoLogThreshold).
    /// </remarks>
    public interface IAvocadoService
    {
        #region State Properties

        /// <summary>
        /// Whether the Avocado system is unlocked.
        /// Unlocked by purchasing the Avocado upgrade with 42 Quantum Points.
        /// </summary>
        bool IsUnlocked { get; }

        /// <summary>
        /// Total Infinity Points accumulated in the Avocado.
        /// </summary>
        double AccumulatedIP { get; }

        /// <summary>
        /// Total Influence accumulated in the Avocado.
        /// </summary>
        double AccumulatedInfluence { get; }

        /// <summary>
        /// Total Strange Matter accumulated in the Avocado.
        /// </summary>
        double AccumulatedStrangeMatter { get; }

        /// <summary>
        /// Overflow multiplier bonus.
        /// </summary>
        double OverflowMultiplier { get; }

        #endregion

        #region Calculations

        /// <summary>
        /// Gets the current global buff multiplier.
        /// Returns 1 if Avocado is not unlocked or no resources meet minimum threshold.
        /// </summary>
        double GlobalBuff { get; }

        /// <summary>
        /// Whether IP meets the minimum threshold (>= 10) to contribute to multiplier.
        /// </summary>
        bool HasMinimumIP { get; }

        /// <summary>
        /// Whether Influence meets the minimum threshold (>= 10) to contribute to multiplier.
        /// </summary>
        bool HasMinimumInfluence { get; }

        /// <summary>
        /// Whether Strange Matter meets the minimum threshold (>= 10) to contribute to multiplier.
        /// </summary>
        bool HasMinimumStrangeMatter { get; }

        /// <summary>
        /// Gets the Log10 contribution from IP (0 if below threshold).
        /// </summary>
        double IPContribution { get; }

        /// <summary>
        /// Gets the Log10 contribution from Influence (0 if below threshold).
        /// </summary>
        double InfluenceContribution { get; }

        /// <summary>
        /// Gets the Log10 contribution from Strange Matter (0 if below threshold).
        /// </summary>
        double StrangeMatterContribution { get; }

        /// <summary>
        /// Gets the overflow contribution (1 + OverflowMultiplier if >= 1, otherwise 1).
        /// </summary>
        double OverflowContribution { get; }

        #endregion

        #region Actions

        /// <summary>
        /// Unlocks the Avocado system. Called when the player purchases the unlock from Quantum upgrades.
        /// </summary>
        void Unlock();

        /// <summary>
        /// Feeds Infinity Points into the Avocado.
        /// </summary>
        /// <param name="amount">Amount of IP to feed.</param>
        void FeedIP(double amount);

        /// <summary>
        /// Feeds Influence into the Avocado.
        /// </summary>
        /// <param name="amount">Amount of Influence to feed.</param>
        void FeedInfluence(long amount);

        /// <summary>
        /// Feeds Strange Matter into the Avocado.
        /// </summary>
        /// <param name="amount">Amount of Strange Matter to feed.</param>
        void FeedStrangeMatter(double amount);

        /// <summary>
        /// Adds to the overflow multiplier.
        /// </summary>
        /// <param name="amount">Amount to add to overflow.</param>
        void AddOverflow(double amount);

        #endregion

        #region Events

        /// <summary>
        /// Fired when the global buff value changes.
        /// </summary>
        event Action<double> OnGlobalBuffChanged;

        /// <summary>
        /// Fired when resources are fed into the Avocado.
        /// </summary>
        event Action OnFed;

        #endregion
    }
}
