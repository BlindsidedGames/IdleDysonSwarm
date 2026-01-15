using System;
using Expansion;
using static Expansion.Oracle;
using static IdleDysonSwarm.Systems.Constants.RealityConstants;

namespace IdleDysonSwarm.Services
{
    /// <summary>
    /// Default implementation of IAvocadoService that wraps Oracle static access.
    /// Manages the Avocado cross-system aggregator that produces a global production multiplier.
    /// </summary>
    public sealed class AvocadoService : IAvocadoService
    {
        private AvocadoData AvocadoData => StaticSaveSettings.avocadoData;
        private PrestigePlus PrestigePlus => StaticSaveSettings.prestigePlus;

        #region State Properties

        public bool IsUnlocked => AvocadoData.unlocked;
        public double AccumulatedIP => AvocadoData.infinityPoints;
        public double AccumulatedInfluence => AvocadoData.influence;
        public double AccumulatedStrangeMatter => AvocadoData.strangeMatter;
        public double OverflowMultiplier => AvocadoData.overflowMultiplier;

        #endregion

        #region Calculations

        public double GlobalBuff
        {
            get
            {
                if (!IsUnlocked)
                    return 1.0;

                double multi = 1.0;

                if (HasMinimumIP)
                    multi *= Math.Log10(AccumulatedIP);

                if (HasMinimumInfluence)
                    multi *= Math.Log10(AccumulatedInfluence);

                if (HasMinimumStrangeMatter)
                    multi *= Math.Log10(AccumulatedStrangeMatter);

                if (OverflowMultiplier >= 1)
                    multi *= 1 + OverflowMultiplier;

                return multi;
            }
        }

        public bool HasMinimumIP => AccumulatedIP >= AvocadoLogThreshold;
        public bool HasMinimumInfluence => AccumulatedInfluence >= AvocadoLogThreshold;
        public bool HasMinimumStrangeMatter => AccumulatedStrangeMatter >= AvocadoLogThreshold;

        public double IPContribution =>
            HasMinimumIP ? Math.Log10(AccumulatedIP) : 0;

        public double InfluenceContribution =>
            HasMinimumInfluence ? Math.Log10(AccumulatedInfluence) : 0;

        public double StrangeMatterContribution =>
            HasMinimumStrangeMatter ? Math.Log10(AccumulatedStrangeMatter) : 0;

        public double OverflowContribution =>
            OverflowMultiplier >= 1 ? 1 + OverflowMultiplier : 1;

        #endregion

        #region Actions

        /// <summary>
        /// Unlocks the Avocado system. Called when the player purchases the unlock from Quantum upgrades.
        /// Also sets the legacy field for backward compatibility during the transition period.
        /// </summary>
        public void Unlock()
        {
            AvocadoData.unlocked = true;
            PrestigePlus.avocatoPurchased = true; // Keep legacy field in sync
        }

        public void FeedIP(double amount)
        {
            if (amount <= 0 || !IsUnlocked)
                return;

            double previousBuff = GlobalBuff;
            AvocadoData.infinityPoints += amount;

            OnFed?.Invoke();

            double newBuff = GlobalBuff;
            if (Math.Abs(newBuff - previousBuff) > 0.001)
            {
                OnGlobalBuffChanged?.Invoke(newBuff);
            }
        }

        public void FeedInfluence(long amount)
        {
            if (amount <= 0 || !IsUnlocked)
                return;

            double previousBuff = GlobalBuff;
            AvocadoData.influence += amount;

            OnFed?.Invoke();

            double newBuff = GlobalBuff;
            if (Math.Abs(newBuff - previousBuff) > 0.001)
            {
                OnGlobalBuffChanged?.Invoke(newBuff);
            }
        }

        public void FeedStrangeMatter(double amount)
        {
            if (amount <= 0 || !IsUnlocked)
                return;

            double previousBuff = GlobalBuff;
            AvocadoData.strangeMatter += amount;

            OnFed?.Invoke();

            double newBuff = GlobalBuff;
            if (Math.Abs(newBuff - previousBuff) > 0.001)
            {
                OnGlobalBuffChanged?.Invoke(newBuff);
            }
        }

        public void AddOverflow(double amount)
        {
            if (amount <= 0 || !IsUnlocked)
                return;

            double previousBuff = GlobalBuff;
            AvocadoData.overflowMultiplier += amount;

            OnFed?.Invoke();

            double newBuff = GlobalBuff;
            if (Math.Abs(newBuff - previousBuff) > 0.001)
            {
                OnGlobalBuffChanged?.Invoke(newBuff);
            }
        }

        #endregion

        #region Events

        public event Action<double> OnGlobalBuffChanged;
        public event Action OnFed;

        #endregion
    }
}
