using System;
using System.Collections.Generic;
using UnityEngine;

/*
 * SimulationUpgradeDefinition
 * Purpose: Data contract for simulation/reality shop upgrades including costs, prerequisites, and side effects.
 * Runs: Runtime + Editor.
 * Primary entry points: Serialized fields consumed by SimulationUpgradeDatabase and ResearchManager balance adapters.
 * Owns vs delegates: Owns static balancing metadata; delegates save mutation and effect execution to effect appliers.
 *
 * Interacts with:
 * - Assets/Scripts/Data/Balance/SimulationUpgradeDatabase.cs (catalog lookup/indexing)
 * - Assets/Scripts/Systems/Balance/SimulationUpgradeStateAccessor.cs (ownership state checks)
 * - Assets/Scripts/Systems/Balance/SimulationUpgradeEffectApplier.cs (purchase side effects)
 * - Assets/Scripts/Expansion/ResearchManager.cs (UI cost/gating reads)
 *
 * Change notes:
 * - `key` is a stable identifier; renaming requires synchronized updates in state/effect adapters.
 * - Prerequisite changes alter progression flow and should be regression-tested against existing saves.
 * - Effect payload changes can alter save mutation behavior; validate with representative purchase paths.
 */
namespace IdleDysonSwarm.Data.Balance
{
    /// <summary>
    /// Logical layer for an upgrade in the simulation/reality economy.
    /// </summary>
    public enum SimulationUpgradeLayer
    {
        /// <summary>
        /// Main simulation progression upgrades.
        /// </summary>
        Simulation,

        /// <summary>
        /// Reality progression upgrades.
        /// </summary>
        Reality
    }

    /// <summary>
    /// Category bucket used for grouping UI sections.
    /// </summary>
    public enum SimulationUpgradeCategory
    {
        /// <summary>
        /// Simulation countermeasure upgrades.
        /// </summary>
        Countermeasures,

        /// <summary>
        /// Simulation education upgrades.
        /// </summary>
        Education,

        /// <summary>
        /// Foundational era simulation upgrades.
        /// </summary>
        Foundational,

        /// <summary>
        /// Information era simulation upgrades.
        /// </summary>
        Information,

        /// <summary>
        /// Space age simulation upgrades.
        /// </summary>
        Space,

        /// <summary>
        /// Reality translation chain upgrades.
        /// </summary>
        Translation,

        /// <summary>
        /// Reality speed chain upgrades.
        /// </summary>
        Speed,

        /// <summary>
        /// Reality quality-of-life upgrades.
        /// </summary>
        QualityOfLife
    }

    /// <summary>
    /// Supported side effect operations for data-driven purchases.
    /// </summary>
    public enum SimulationUpgradeEffectType
    {
        /// <summary>
        /// Sets a prestige-flag style boolean by key.
        /// </summary>
        SetPrestigeFlag,

        /// <summary>
        /// Sets a save-data boolean by key.
        /// </summary>
        SetSaveFlag,

        /// <summary>
        /// Adds skill points.
        /// </summary>
        AddSkillPoints,

        /// <summary>
        /// Sets a Dream1 save-data boolean by key.
        /// </summary>
        SetDream1Flag,

        /// <summary>
        /// Sets a Dream1 numeric value.
        /// </summary>
        SetDream1Value,

        /// <summary>
        /// Sets a SaveData numeric value.
        /// </summary>
        SetSaveValue,

        /// <summary>
        /// Sets Dream1 numeric value to max(current, configured).
        /// </summary>
        MaxDream1Value,

        /// <summary>
        /// Sets SaveData numeric value to max(current, configured).
        /// </summary>
        MaxSaveValue,

        /// <summary>
        /// Sets a prestige numeric value.
        /// </summary>
        SetPrestigeValue
    }

    /// <summary>
    /// Prerequisite constraint for upgrade visibility/purchase.
    /// </summary>
    [Serializable]
    public sealed class SimulationUpgradePrerequisite
    {
        /// <summary>
        /// Stable key of the required upgrade.
        /// </summary>
        public string key;

        /// <summary>
        /// Whether the required upgrade must be owned.
        /// </summary>
        public bool mustBeOwned = true;
    }

    /// <summary>
    /// Side effect payload executed on successful purchase.
    /// </summary>
    [Serializable]
    public sealed class SimulationUpgradeEffect
    {
        /// <summary>
        /// Effect operation type.
        /// </summary>
        public SimulationUpgradeEffectType effectType = SimulationUpgradeEffectType.SetPrestigeFlag;

        /// <summary>
        /// Target key consumed by state/effect adapters.
        /// </summary>
        public string targetKey;

        /// <summary>
        /// Boolean payload value.
        /// </summary>
        public bool boolValue = true;

        /// <summary>
        /// Numeric payload value.
        /// </summary>
        public double numericValue;
    }

    /// <summary>
    /// Data-driven definition for one simulation/reality shop upgrade.
    /// </summary>
    [CreateAssetMenu(fileName = "SimulationUpgrade", menuName = "Idle Dyson/Balance/Simulation Upgrade")]
    public sealed class SimulationUpgradeDefinition : ScriptableObject
    {
        /// <summary>
        /// Stable key used by code adapters and data links.
        /// </summary>
        public string key;

        /// <summary>
        /// Layer grouping.
        /// </summary>
        public SimulationUpgradeLayer layer = SimulationUpgradeLayer.Simulation;

        /// <summary>
        /// Category grouping.
        /// </summary>
        public SimulationUpgradeCategory category = SimulationUpgradeCategory.Countermeasures;

        /// <summary>
        /// Display title.
        /// </summary>
        public string title;

        /// <summary>
        /// Display description.
        /// </summary>
        [TextArea]
        public string description;

        /// <summary>
        /// Strange matter purchase cost.
        /// </summary>
        [Min(0)]
        public int cost;

        /// <summary>
        /// Upgrade prerequisites.
        /// </summary>
        public List<SimulationUpgradePrerequisite> prerequisites = new List<SimulationUpgradePrerequisite>();

        /// <summary>
        /// Side effects to apply after purchase.
        /// </summary>
        public List<SimulationUpgradeEffect> purchaseEffects = new List<SimulationUpgradeEffect>();
    }
}
