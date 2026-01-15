using System;
using UnityEngine;

namespace IdleDysonSwarm.Data
{
    /// <summary>
    /// Defines how upgrade cost scales with purchase count.
    /// </summary>
    public enum CostScalingType
    {
        /// <summary>
        /// Cost remains constant regardless of purchases.
        /// </summary>
        Flat,

        /// <summary>
        /// Cost doubles with each purchase (2^n * baseCost).
        /// </summary>
        Exponential
    }

    /// <summary>
    /// ScriptableObject defining a Quantum Leap upgrade.
    /// Used to replace hardcoded upgrade definitions in QuantumService.
    /// </summary>
    [CreateAssetMenu(menuName = "Idle Dyson/Quantum Upgrade Definition")]
    public sealed class QuantumUpgradeDefinition : ScriptableObject
    {
        [Header("Identity")]
        [Tooltip("Unique identifier matching QuantumUpgradeType enum name (e.g., 'BotMultitasking')")]
        public string id;

        [Tooltip("Display name shown in UI")]
        public string displayName;

        [TextArea]
        [Tooltip("Description of what this upgrade does")]
        public string description;

        [Header("Cost")]
        [Tooltip("Base cost in Quantum Points")]
        [Min(1)]
        public int baseCost = 1;

        [Tooltip("How cost scales with repeated purchases")]
        public CostScalingType costScaling = CostScalingType.Flat;

        [Header("Repeatability")]
        [Tooltip("Whether this upgrade can be purchased multiple times")]
        public bool isRepeatable;

        [Tooltip("Maximum number of purchases allowed. 0 = unlimited for repeatable, 1 for one-time.")]
        [Min(0)]
        public int maxPurchases = 1;

        /// <summary>
        /// Calculates the cost for a given purchase count.
        /// </summary>
        /// <param name="currentPurchases">Number of times already purchased.</param>
        /// <returns>Cost in Quantum Points for the next purchase.</returns>
        public int GetCostForPurchaseCount(int currentPurchases)
        {
            return costScaling switch
            {
                CostScalingType.Flat => baseCost,
                CostScalingType.Exponential => currentPurchases >= 1
                    ? (int)Math.Pow(2, currentPurchases) * baseCost
                    : baseCost,
                _ => baseCost
            };
        }

        /// <summary>
        /// Checks if more purchases are allowed.
        /// </summary>
        /// <param name="currentPurchases">Number of times already purchased.</param>
        /// <returns>True if another purchase is allowed.</returns>
        public bool CanPurchaseMore(int currentPurchases)
        {
            if (!isRepeatable)
                return currentPurchases < 1;

            if (maxPurchases <= 0)
                return true; // Unlimited

            return currentPurchases < maxPurchases;
        }
    }
}
