using System;
using System.Collections.Generic;
using IdleDysonSwarm.Data.Balance;

/*
 * SimulationUpgradeDefaultsCatalog
 * Purpose: Central fallback catalog for simulation/reality upgrades when ScriptableObject assets are missing.
 * Runs: Runtime + Editor.
 * Primary entry points: All, TryGetSpec(), GetDefaultCost().
 * Owns vs delegates: Owns fallback key/cost/prerequisite/effect data; delegates state checks + mutation to accessor/effect applier layers.
 *
 * Interacts with:
 * - Assets/Scripts/Expansion/ResearchManager.cs
 * - Assets/Scripts/Systems/Balance/SimulationUpgradeStateAccessor.cs
 * - Assets/Scripts/Systems/Balance/SimulationUpgradeEffectApplier.cs
 * - Assets/Editor/Balance/BalanceDataAssetCreator.cs
 *
 * Change notes:
 * - Keys must remain aligned with existing save field names for compatibility.
 * - Cost or prerequisite changes alter progression pacing and UI unlock flow.
 * - Effect changes alter save mutations and should be validated against representative saves.
 */
namespace IdleDysonSwarm.Systems.Balance
{
    /// <summary>
    /// One fallback simulation/reality upgrade specification.
    /// </summary>
    public sealed class SimulationUpgradeSpec
    {
        /// <summary>
        /// Creates an immutable fallback spec.
        /// </summary>
        /// <param name="key">Stable upgrade key.</param>
        /// <param name="layer">Upgrade layer.</param>
        /// <param name="category">Upgrade category.</param>
        /// <param name="title">Display title.</param>
        /// <param name="description">Display description.</param>
        /// <param name="cost">Strange matter cost.</param>
        /// <param name="prerequisites">Required upgrade keys.</param>
        /// <param name="effects">Effects applied on purchase/apply.</param>
        public SimulationUpgradeSpec(
            string key,
            SimulationUpgradeLayer layer,
            SimulationUpgradeCategory category,
            string title,
            string description,
            int cost,
            IReadOnlyList<SimulationUpgradePrerequisite> prerequisites,
            IReadOnlyList<SimulationUpgradeEffect> effects)
        {
            Key = key;
            Layer = layer;
            Category = category;
            Title = title;
            Description = description;
            Cost = cost;
            Prerequisites = prerequisites ?? Array.Empty<SimulationUpgradePrerequisite>();
            Effects = effects ?? Array.Empty<SimulationUpgradeEffect>();
        }

        /// <summary>
        /// Stable upgrade key.
        /// </summary>
        public string Key { get; }

        /// <summary>
        /// Layer grouping.
        /// </summary>
        public SimulationUpgradeLayer Layer { get; }

        /// <summary>
        /// Category grouping.
        /// </summary>
        public SimulationUpgradeCategory Category { get; }

        /// <summary>
        /// Display title.
        /// </summary>
        public string Title { get; }

        /// <summary>
        /// Display description.
        /// </summary>
        public string Description { get; }

        /// <summary>
        /// Strange matter cost.
        /// </summary>
        public int Cost { get; }

        /// <summary>
        /// Prerequisite keys.
        /// </summary>
        public IReadOnlyList<SimulationUpgradePrerequisite> Prerequisites { get; }

        /// <summary>
        /// Purchase effects.
        /// </summary>
        public IReadOnlyList<SimulationUpgradeEffect> Effects { get; }
    }

    /// <summary>
    /// Fallback catalog for simulation and reality upgrade definitions.
    /// </summary>
    public static class SimulationUpgradeDefaultsCatalog
    {
        /// <summary>
        /// Ordered fallback specs.
        /// </summary>
        private static readonly List<SimulationUpgradeSpec> OrderedSpecs = BuildSpecs();

        /// <summary>
        /// Key lookup for fallback specs.
        /// </summary>
        private static readonly Dictionary<string, SimulationUpgradeSpec> ByKey = BuildLookup(OrderedSpecs);

        /// <summary>
        /// Gets all fallback specs in default order.
        /// </summary>
        public static IReadOnlyList<SimulationUpgradeSpec> All => OrderedSpecs;

        /// <summary>
        /// Tries to resolve a fallback spec by key.
        /// </summary>
        /// <param name="key">Upgrade key.</param>
        /// <param name="spec">Resolved spec.</param>
        /// <returns>True if key exists in fallback catalog.</returns>
        public static bool TryGetSpec(string key, out SimulationUpgradeSpec spec)
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                spec = null;
                return false;
            }

            return ByKey.TryGetValue(key, out spec);
        }

        /// <summary>
        /// Gets fallback cost for a key.
        /// </summary>
        /// <param name="key">Upgrade key.</param>
        /// <param name="fallback">Fallback when key is missing.</param>
        /// <returns>Configured fallback cost.</returns>
        public static int GetDefaultCost(string key, int fallback = 0)
        {
            return TryGetSpec(key, out SimulationUpgradeSpec spec) ? spec.Cost : fallback;
        }

        private static Dictionary<string, SimulationUpgradeSpec> BuildLookup(IReadOnlyList<SimulationUpgradeSpec> specs)
        {
            var result = new Dictionary<string, SimulationUpgradeSpec>(StringComparer.Ordinal);
            if (specs == null)
            {
                return result;
            }

            for (int i = 0; i < specs.Count; i++)
            {
                SimulationUpgradeSpec spec = specs[i];
                if (spec == null || string.IsNullOrWhiteSpace(spec.Key) || result.ContainsKey(spec.Key))
                {
                    continue;
                }

                result.Add(spec.Key, spec);
            }

            return result;
        }

        private static List<SimulationUpgradeSpec> BuildSpecs()
        {
            var specs = new List<SimulationUpgradeSpec>
            {
                // Countermeasures
                S("counterMeteor", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Countermeasures, "Counteract Meteor Storm", 4,
                    Effects(FlagP("counterMeteor"), NumP("disasterStage", 2))),
                S("counterAi", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Countermeasures, "Counteract AI Overlords", 42,
                    Effects(FlagP("counterAi"), NumP("disasterStage", 3)), "counterMeteor"),
                S("counterGw", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Countermeasures, "Counteract Global Warming", 128,
                    Effects(FlagP("counterGw"), NumP("disasterStage", 42)), "counterAi"),

                // Education
                S("engineering1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Engineering I", 2,
                    Effects(FlagP("engineering1"), NumD1("engineeringResearchTime", 300)), "counterMeteor"),
                S("engineering2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Engineering II", 10,
                    Effects(FlagP("engineering2"), NumD1("engineeringResearchTime", 60)), "engineering1"),
                S("engineering3", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Engineering III", 42,
                    Effects(FlagP("engineering3"), FlagD1("engineeringComplete")), "engineering2"),
                S("shipping1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Shipping I", 18,
                    Effects(FlagP("shipping1"), NumD1("shippingResearchTime", 600)), "engineering1"),
                S("shipping2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Shipping II", 27,
                    Effects(FlagP("shipping2"), FlagD1("shippingComplete")), "shipping1"),
                S("worldTrade1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "World Trade I", 44,
                    Effects(FlagP("worldTrade1"), NumD1("worldTradeResearchTime", 1800)), "shipping1"),
                S("worldTrade2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "World Trade II", 88,
                    Effects(FlagP("worldTrade2"), NumD1("worldTradeResearchTime", 600)), "worldTrade1"),
                S("worldTrade3", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "World Trade III", 124,
                    Effects(FlagP("worldTrade3"), FlagD1("worldTradeComplete")), "worldTrade2"),
                S("worldPeace1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "World Peace I", 52,
                    Effects(FlagP("worldPeace1"), NumD1("worldPeaceResearchTime", 3600)), "worldTrade1"),
                S("worldPeace2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "World Peace II", 74,
                    Effects(FlagP("worldPeace2"), NumD1("worldPeaceResearchTime", 1800)), "worldPeace1"),
                S("worldPeace3", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "World Peace III", 188,
                    Effects(FlagP("worldPeace3"), NumD1("worldPeaceResearchTime", 600)), "worldPeace2"),
                S("worldPeace4", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "World Peace IV", 324,
                    Effects(FlagP("worldPeace4"), FlagD1("worldPeaceComplete")), "worldPeace3"),
                S("mathematics1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Mathematics I", 44,
                    Effects(FlagP("mathematics1"), NumD1("mathematicsResearchTime", 1800)), "counterAi"),
                S("mathematics2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Mathematics II", 88,
                    Effects(FlagP("mathematics2"), NumD1("mathematicsResearchTime", 600)), "mathematics1"),
                S("mathematics3", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Mathematics III", 124,
                    Effects(FlagP("mathematics3"), FlagD1("mathematicsComplete"), MaxNumD1("solarPanelGeneration", 200)), "mathematics2"),
                S("advancedPhysics1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Advanced Physics I", 92,
                    Effects(FlagP("advancedPhysics1"), NumD1("advancedPhysicsResearchTime", 3600)), "mathematics1"),
                S("advancedPhysics2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Advanced Physics II", 126,
                    Effects(FlagP("advancedPhysics2"), NumD1("advancedPhysicsResearchTime", 1800)), "advancedPhysics1"),
                S("advancedPhysics3", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Advanced Physics III", 381,
                    Effects(FlagP("advancedPhysics3"), NumD1("advancedPhysicsResearchTime", 600)), "advancedPhysics2"),
                S("advancedPhysics4", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Education, "Advanced Physics IV", 654,
                    Effects(FlagP("advancedPhysics4"), FlagD1("advancedPhysicsComplete")), "advancedPhysics3"),

                // Foundational
                S("hunter1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Foundational, "Start with 1 Hunter", 2,
                    Effects(FlagP("hunter1"), MaxNumD1("hunters", 1))),
                S("hunter2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Foundational, "Start with 10 Hunters", 20,
                    Effects(FlagP("hunter2"), MaxNumD1("hunters", 10)), "hunter1"),
                S("hunter3", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Foundational, "Start with 1000 Hunters", 40,
                    Effects(FlagP("hunter3"), MaxNumD1("hunters", 1000)), "hunter2"),
                S("hunter4", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Foundational, "Purchase buys 1000 Hunters", 40,
                    Effects(FlagP("hunter4"), NumS("huntersPerPurchase", 1000)), "hunter2"),
                S("gatherer1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Foundational, "Start with 1 Gatherer", 2,
                    Effects(FlagP("gatherer1"), MaxNumD1("gatherers", 1))),
                S("gatherer2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Foundational, "Start with 10 Gatherers", 20,
                    Effects(FlagP("gatherer2"), MaxNumD1("gatherers", 10)), "gatherer1"),
                S("gatherer3", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Foundational, "Start with 1000 Gatherers", 40,
                    Effects(FlagP("gatherer3"), MaxNumD1("gatherers", 1000)), "gatherer2"),
                S("gatherer4", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Foundational, "Purchase buys 1000 Gatherers", 40,
                    Effects(FlagP("gatherer4"), NumS("gatherersPerPurchase", 1000)), "gatherer2"),
                S("workerBoost", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Foundational, "Log10 Workers", 42,
                    Effects(FlagP("workerBoost"), FlagP("workerBoostAcivator"))),
                S("citiesBoost", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Foundational, "City Booster", 1337,
                    Effects(FlagP("citiesBoost"), FlagP("citiesBoostActivator")), "counterMeteor"),

                // Information
                S("factoriesBoost", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Information, "Factories", 21,
                    Effects(FlagP("factoriesBoost"), FlagP("factoriesBoostActivator")), "counterAi"),
                S("bots1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Information, "Bots I", 211,
                    Effects(FlagP("bots1"), FlagP("botsBoost1Activator")), "counterAi"),
                S("bots2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Information, "Bots II", 1111,
                    Effects(FlagP("bots2"), FlagP("botsBoost2Activator")), "bots1"),
                S("rockets1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Information, "Rockets I", 1111,
                    Effects(FlagP("rockets1"), NumD1("rocketsPerSpaceFactory", 5)), "counterGw"),
                S("rockets2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Information, "Rockets II", 2222,
                    Effects(FlagP("rockets2"), NumD1("rocketsPerSpaceFactory", 3)), "rockets1"),
                S("rockets3", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Information, "Rockets III", 3333,
                    Effects(FlagP("rockets3"), NumD1("rocketsPerSpaceFactory", 1)), "rockets2"),

                // Space
                S("sfacs1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Space, "Space Factories I", 1221,
                    Effects(FlagP("sfacs1"), FlagP("sfActivator1")), "counterGw"),
                S("sfacs2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Space, "Space Factories II", 12221,
                    Effects(FlagP("sfacs2"), FlagP("sfActivator2")), "sfacs1"),
                S("sfacs3", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Space, "Space Factories III", 122221,
                    Effects(FlagP("sfacs3"), FlagP("sfActivator3")), "sfacs2"),
                S("railguns1", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Space, "Railguns I", 1221,
                    Effects(FlagP("railguns1"), FlagP("railgunActivator1")), "counterGw"),
                S("railguns2", SimulationUpgradeLayer.Simulation, SimulationUpgradeCategory.Space, "Railguns II", 12221,
                    Effects(FlagP("railguns2"), FlagP("railgunActivator2")), "railguns1"),

                // Reality translation
                S("translation1", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Translation, "Translation I", 8,
                    Effects(FlagP("translation1"), SkillPoints(1))),
                S("translation2", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Translation, "Translation II", 16,
                    Effects(FlagP("translation2"), SkillPoints(1)), "translation1"),
                S("translation3", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Translation, "Translation III", 32,
                    Effects(FlagP("translation3"), SkillPoints(1)), "translation2"),
                S("translation4", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Translation, "Translation IV", 64,
                    Effects(FlagP("translation4"), SkillPoints(1)), "translation3"),
                S("translation5", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Translation, "Translation V", 128,
                    Effects(FlagP("translation5"), SkillPoints(1)), "translation4"),
                S("translation6", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Translation, "Translation VI", 256,
                    Effects(FlagP("translation6"), SkillPoints(1)), "translation5"),
                S("translation7", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Translation, "Translation VII", 512,
                    Effects(FlagP("translation7"), SkillPoints(1)), "translation6"),
                S("translation8", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Translation, "Translation VIII", 1024,
                    Effects(FlagP("translation8"), SkillPoints(1)), "translation7"),

                // Reality speed
                S("speed1", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Speed, "Speed Reduction I", 2048,
                    Effects(FlagP("speed1"), SkillPoints(1))),
                S("speed2", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Speed, "Speed Reduction II", 4096,
                    Effects(FlagP("speed2"), SkillPoints(1)), "speed1"),
                S("speed3", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Speed, "Speed Reduction III", 8192,
                    Effects(FlagP("speed3"), SkillPoints(1)), "speed2"),
                S("speed4", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Speed, "Speed Reduction IV", 16384,
                    Effects(FlagP("speed4"), SkillPoints(1)), "speed3"),
                S("speed5", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Speed, "Speed Reduction V", 32768,
                    Effects(FlagP("speed5"), SkillPoints(1)), "speed4"),
                S("speed6", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Speed, "Speed Reduction VI", 65536,
                    Effects(FlagP("speed6"), SkillPoints(1)), "speed5"),
                S("speed7", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Speed, "Speed Reduction VII", 131072,
                    Effects(FlagP("speed7"), SkillPoints(1)), "speed6"),
                S("speed8", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.Speed, "Speed Reduction VIII", 262144,
                    Effects(FlagP("speed8"), SkillPoints(1)), "speed7"),

                // Reality qol
                S("doubleTimeOwned", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.QualityOfLife, "Enable Time Multiplier", 5,
                    Effects(FlagP("doubleTimeOwned"), NumP("doubleTime", 600))),
                S("workerAutoConvert", SimulationUpgradeLayer.Reality, SimulationUpgradeCategory.QualityOfLife, "Automate Gather Influence", 10,
                    Effects(FlagS("workerAutoConvert")))
            };

            return specs;
        }

        private static SimulationUpgradeSpec S(
            string key,
            SimulationUpgradeLayer layer,
            SimulationUpgradeCategory category,
            string title,
            int cost,
            IReadOnlyList<SimulationUpgradeEffect> effects,
            params string[] prerequisiteKeys)
        {
            return new SimulationUpgradeSpec(
                key,
                layer,
                category,
                title,
                title,
                cost,
                Prerequisites(prerequisiteKeys),
                effects);
        }

        private static IReadOnlyList<SimulationUpgradePrerequisite> Prerequisites(IReadOnlyList<string> keys)
        {
            if (keys == null || keys.Count == 0)
            {
                return Array.Empty<SimulationUpgradePrerequisite>();
            }

            var prerequisites = new List<SimulationUpgradePrerequisite>(keys.Count);
            for (int i = 0; i < keys.Count; i++)
            {
                string key = keys[i];
                if (string.IsNullOrWhiteSpace(key))
                {
                    continue;
                }

                prerequisites.Add(new SimulationUpgradePrerequisite
                {
                    key = key,
                    mustBeOwned = true
                });
            }

            return prerequisites;
        }

        private static IReadOnlyList<SimulationUpgradeEffect> Effects(params SimulationUpgradeEffect[] effects)
        {
            if (effects == null || effects.Length == 0)
            {
                return Array.Empty<SimulationUpgradeEffect>();
            }

            var copy = new List<SimulationUpgradeEffect>(effects.Length);
            for (int i = 0; i < effects.Length; i++)
            {
                if (effects[i] != null)
                {
                    copy.Add(effects[i]);
                }
            }

            return copy;
        }

        private static SimulationUpgradeEffect FlagP(string key)
        {
            return new SimulationUpgradeEffect
            {
                effectType = SimulationUpgradeEffectType.SetPrestigeFlag,
                targetKey = key,
                boolValue = true
            };
        }

        private static SimulationUpgradeEffect FlagS(string key)
        {
            return new SimulationUpgradeEffect
            {
                effectType = SimulationUpgradeEffectType.SetSaveFlag,
                targetKey = key,
                boolValue = true
            };
        }

        private static SimulationUpgradeEffect FlagD1(string key)
        {
            return new SimulationUpgradeEffect
            {
                effectType = SimulationUpgradeEffectType.SetDream1Flag,
                targetKey = key,
                boolValue = true
            };
        }

        private static SimulationUpgradeEffect NumP(string key, double value)
        {
            return new SimulationUpgradeEffect
            {
                effectType = SimulationUpgradeEffectType.SetPrestigeValue,
                targetKey = key,
                numericValue = value
            };
        }

        private static SimulationUpgradeEffect NumS(string key, double value)
        {
            return new SimulationUpgradeEffect
            {
                effectType = SimulationUpgradeEffectType.SetSaveValue,
                targetKey = key,
                numericValue = value
            };
        }

        private static SimulationUpgradeEffect NumD1(string key, double value)
        {
            return new SimulationUpgradeEffect
            {
                effectType = SimulationUpgradeEffectType.SetDream1Value,
                targetKey = key,
                numericValue = value
            };
        }

        private static SimulationUpgradeEffect MaxNumD1(string key, double value)
        {
            return new SimulationUpgradeEffect
            {
                effectType = SimulationUpgradeEffectType.MaxDream1Value,
                targetKey = key,
                numericValue = value
            };
        }

        private static SimulationUpgradeEffect SkillPoints(double value)
        {
            return new SimulationUpgradeEffect
            {
                effectType = SimulationUpgradeEffectType.AddSkillPoints,
                numericValue = value
            };
        }
    }
}
