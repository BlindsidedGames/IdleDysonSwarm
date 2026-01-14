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
        private PrestigePlus PrestigePlus => StaticSaveSettings.prestigePlus;

        #region State Properties

        public bool IsUnlocked => PrestigePlus.avocatoPurchased;
        public double AccumulatedIP => PrestigePlus.avocatoIP;
        public double AccumulatedInfluence => PrestigePlus.avocatoInfluence;
        public double AccumulatedStrangeMatter => PrestigePlus.avocatoStrangeMatter;
        public double OverflowMultiplier => PrestigePlus.avocatoOverflow;

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

        public void FeedIP(double amount)
        {
            if (amount <= 0 || !IsUnlocked)
                return;

            double previousBuff = GlobalBuff;
            PrestigePlus.avocatoIP += amount;

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
            PrestigePlus.avocatoInfluence += amount;

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
            PrestigePlus.avocatoStrangeMatter += amount;

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
            PrestigePlus.avocatoOverflow += amount;

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
