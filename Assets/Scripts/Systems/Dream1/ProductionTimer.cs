using System;
using Systems.Numeric;
using UnityEngine;

namespace IdleDysonSwarm.Systems.Dream1
{
    /// <summary>
    /// Reusable production timer for Dream1 buildings.
    /// Handles the common pattern: Log10 multiplier + global boost + while-loop production.
    /// </summary>
    /// <remarks>
    /// All Dream1 production timers follow the same formula:
    /// - Base multiplier: 1 + Log10(sourceCount)
    /// - Global multiplier: doubleTime boost, building-specific boosts
    /// - Accumulate time until duration reached, then produce
    ///
    /// This class encapsulates that pattern to eliminate duplication across
    /// FoundationalEraManager, InformationEraManager, and SpaceAgeManager.
    /// </remarks>
    [Serializable]
    public class ProductionTimer
    {
        /// <summary>
        /// Current accumulated time towards next production tick.
        /// This value should be synced to save data for persistence.
        /// </summary>
        [SerializeField] public double currentTime;

        /// <summary>
        /// Base duration in seconds for one production cycle.
        /// </summary>
        [SerializeField] public double duration;

        /// <summary>
        /// Creates a new ProductionTimer with specified duration.
        /// </summary>
        /// <param name="duration">Base duration in seconds for one production cycle.</param>
        public ProductionTimer(double duration)
        {
            this.duration = duration;
            this.currentTime = 0;
        }

        /// <summary>
        /// Creates a new ProductionTimer with specified duration and initial time.
        /// Use this when restoring from save data.
        /// </summary>
        /// <param name="duration">Base duration in seconds for one production cycle.</param>
        /// <param name="savedTime">Saved progress time to restore.</param>
        public ProductionTimer(double duration, double savedTime)
        {
            this.duration = duration;
            this.currentTime = savedTime;
        }

        /// <summary>
        /// Default constructor for serialization.
        /// </summary>
        public ProductionTimer()
        {
            this.duration = 1f;
            this.currentTime = 0;
        }

        /// <summary>
        /// Updates the timer and returns the number of items produced this frame.
        /// </summary>
        /// <param name="sourceCount">Count of source buildings (hunters, factories, etc.)</param>
        /// <param name="globalMultiplier">Combined multiplier (doubleTime, boosts, etc.)</param>
        /// <param name="deltaTime">Time.deltaTime</param>
        /// <returns>Number of production cycles completed this frame.</returns>
        public double Update(
            double sourceCount,
            double globalMultiplier,
            double deltaTime)
        {
            if (sourceCount < 1 || duration <= 0 ||
                !NumericSafety.IsFinite(sourceCount) ||
                !NumericSafety.IsFinite(globalMultiplier) ||
                !NumericSafety.IsFinite(deltaTime) ||
                globalMultiplier < 0 || deltaTime < 0)
            {
                return 0d;
            }

            // Standard Dream1 multiplier formula: 1 + Log10(count)
            double baseMulti = 1 + Math.Log10(sourceCount);
            return Advance(baseMulti, globalMultiplier, deltaTime);
        }

        /// <summary>
        /// Updates the timer with a custom base multiplier (bypasses Log10 calculation).
        /// Use this for special cases like bots soft-start ramp-up.
        /// </summary>
        /// <param name="customBaseMulti">Custom base multiplier instead of 1 + Log10(count).</param>
        /// <param name="globalMultiplier">Combined multiplier (doubleTime, boosts, etc.)</param>
        /// <param name="deltaTime">Time.deltaTime</param>
        /// <returns>Number of production cycles completed this frame.</returns>
        public double UpdateWithCustomMultiplier(
            double customBaseMulti,
            double globalMultiplier,
            double deltaTime)
        {
            if (duration <= 0 ||
                !NumericSafety.IsFinite(customBaseMulti) ||
                !NumericSafety.IsFinite(globalMultiplier) ||
                !NumericSafety.IsFinite(deltaTime) ||
                customBaseMulti < 0d || globalMultiplier < 0d ||
                deltaTime < 0d)
            {
                return 0d;
            }

            return Advance(
                customBaseMulti,
                globalMultiplier,
                deltaTime);
        }

        private double Advance(
            double baseMultiplier,
            double globalMultiplier,
            double deltaTime)
        {
            if (!NumericSafety.IsFinite(currentTime) ||
                currentTime < 0d)
            {
                currentTime = 0d;
            }

            NumericResult<double> effective =
                NumericSafety.Multiply(
                    baseMultiplier,
                    globalMultiplier);
            NumericResult<double> added =
                NumericSafety.Multiply(
                    deltaTime,
                    effective.Value);
            NumericResult<double> accumulated =
                NumericSafety.Add(
                    currentTime,
                    added.Value);
            if (!effective.IsSuccess ||
                !added.IsSuccess ||
                !accumulated.IsSuccess)
            {
                return 0d;
            }

            currentTime = accumulated.Value;
            NumericResult<double> quotient =
                NumericSafety.Divide(
                    currentTime,
                    duration);
            if (!quotient.IsSuccess)
                return 0d;
            double completed = Math.Floor(quotient.Value);
            if (!NumericSafety.IsFinite(completed) ||
                completed <= 0d)
            {
                return 0d;
            }

            double remainder = currentTime % duration;
            currentTime =
                NumericSafety.IsFinite(remainder) &&
                remainder >= 0d &&
                remainder < duration
                    ? remainder
                    : 0d;
            return Math.Min(double.MaxValue, completed);
        }

        /// <summary>
        /// Gets the effective multiplier for a given source count and global multiplier.
        /// Useful for UI display of production rate.
        /// </summary>
        /// <param name="sourceCount">Count of source buildings.</param>
        /// <param name="globalMultiplier">Combined multiplier.</param>
        /// <returns>Effective production multiplier.</returns>
        public double GetEffectiveMultiplier(double sourceCount, double globalMultiplier)
        {
            if (sourceCount < 1) return 0;
            double baseMulti = 1 + Math.Log10(sourceCount);
            return baseMulti * globalMultiplier;
        }

        /// <summary>
        /// Fill bar amount (0-1) for UI.
        /// </summary>
        public float FillAmount
        {
            get
            {
                if (duration <= 0) return 0;
                return Mathf.Clamp01((float)(currentTime / duration));
            }
        }

        /// <summary>
        /// Calculates fill amount accounting for high-speed production.
        /// Returns 1 when production is effectively instant (rate > threshold).
        /// </summary>
        /// <param name="sourceCount">Count of source buildings.</param>
        /// <param name="globalMultiplier">Combined multiplier.</param>
        /// <param name="instantThreshold">Threshold below which production appears instant (default 0.2s).</param>
        /// <returns>Fill amount for UI display.</returns>
        public float GetFillAmount(double sourceCount, double globalMultiplier, float instantThreshold = 0.2f)
        {
            if (sourceCount < 1) return 0;
            double effectiveMulti = GetEffectiveMultiplier(sourceCount, globalMultiplier);
            if (effectiveMulti <= 0) return 0;

            double effectiveDuration = duration / effectiveMulti;
            if (effectiveDuration < instantThreshold) return 1f; // Instant production visual

            return FillAmount;
        }

        /// <summary>
        /// Time remaining until next production tick.
        /// </summary>
        /// <param name="effectiveMultiplier">Pre-calculated effective multiplier.</param>
        /// <returns>Time remaining in seconds.</returns>
        public float GetTimeRemaining(double effectiveMultiplier)
        {
            if (effectiveMultiplier <= 0 || duration <= 0) return float.MaxValue;
            return NumericSafety.ToFloat((duration - currentTime) / effectiveMultiplier).Value;
        }

        /// <summary>
        /// Production rate per second for UI display.
        /// </summary>
        /// <param name="effectiveMultiplier">Pre-calculated effective multiplier.</param>
        /// <returns>Items produced per second.</returns>
        public double GetProductionRate(double effectiveMultiplier)
        {
            if (duration <= 0) return 0;
            return effectiveMultiplier / duration;
        }

        /// <summary>
        /// Resets the timer to zero (used on prestige).
        /// </summary>
        public void Reset()
        {
            currentTime = 0;
        }
    }
}
