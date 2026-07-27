/*
 * Purpose: Pure, save-backed Dyson facility and research automation transactions.
 * Runs: Shared event-time simulation for active and stored-time automation events.
 * Owns: Affordability, buy-mode quantity selection, atomic debit/ownership mutation.
 * Delegates: Authored definition capture and presentation refresh to scene adapters.
 */

using System;
using System.Collections.Generic;
using Blindsided.Utilities;
using Expansion;
using GameData;
using Systems.Facilities;
using Systems.Numeric;
using static Expansion.Oracle;

namespace Systems.Simulation
{
    public readonly struct DysonFacilityAutomationRule
    {
        public DysonFacilityAutomationRule(
            string facilityId,
            double baseCost,
            double costExponent,
            bool enabled,
            bool unlocked,
            bool subtractRetainedTen,
            bool useAssemblyMegaDiscount,
            long maximumQuantity = long.MaxValue)
        {
            FacilityId = facilityId;
            BaseCost = baseCost;
            CostExponent = costExponent;
            Enabled = enabled;
            Unlocked = unlocked;
            SubtractRetainedTen = subtractRetainedTen;
            UseAssemblyMegaDiscount = useAssemblyMegaDiscount;
            MaximumQuantity = maximumQuantity;
        }

        public string FacilityId { get; }
        public double BaseCost { get; }
        public double CostExponent { get; }
        public bool Enabled { get; }
        public bool Unlocked { get; }
        public bool SubtractRetainedTen { get; }
        public bool UseAssemblyMegaDiscount { get; }
        public long MaximumQuantity { get; }
    }

    public readonly struct ResearchAutomationRule
    {
        public ResearchAutomationRule(
            string researchId,
            double baseCost,
            double exponent,
            int maxLevel,
            ResearchAutoBuyGroup autoBuyGroup,
            string[] prerequisiteResearchIds,
            string prerequisiteFacilityId,
            double prerequisiteFacilityOwned,
            double percentPerLevel)
        {
            ResearchId = researchId;
            BaseCost = baseCost;
            Exponent = exponent;
            MaxLevel = maxLevel;
            AutoBuyGroup = autoBuyGroup;
            PrerequisiteResearchIds = prerequisiteResearchIds;
            PrerequisiteFacilityId = prerequisiteFacilityId;
            PrerequisiteFacilityOwned = prerequisiteFacilityOwned;
            PercentPerLevel = percentPerLevel;
        }

        public string ResearchId { get; }
        public double BaseCost { get; }
        public double Exponent { get; }
        public int MaxLevel { get; }
        public ResearchAutoBuyGroup AutoBuyGroup { get; }
        public string[] PrerequisiteResearchIds { get; }
        public string PrerequisiteFacilityId { get; }
        public double PrerequisiteFacilityOwned { get; }
        public double PercentPerLevel { get; }
    }

    public static class DysonAutomationTransactions
    {
        private const double ExponentEpsilon = 1e-9d;

        public static bool TryPurchaseFacility(
            SaveDataSettings settings,
            DysonFacilityAutomationRule rule,
            SimulationAutomationPolicy policy,
            out long quantity)
        {
            quantity = 0L;
            if (settings == null ||
                !rule.Enabled ||
                !rule.Unlocked ||
                string.IsNullOrEmpty(rule.FacilityId) ||
                !NumericSafety.IsFinite(rule.BaseCost) ||
                rule.BaseCost <= 0d ||
                !NumericSafety.IsFinite(rule.CostExponent) ||
                rule.CostExponent <= 0d)
            {
                return false;
            }

            DysonVerseInfinityData infinity =
                settings.dysonVerseSaveData?.dysonVerseInfinityData;
            DysonVerseSkillTreeData skills =
                settings.dysonVerseSaveData?.dysonVerseSkillTreeData;
            if (infinity == null ||
                !NumericSafety.IsFinite(infinity.money) ||
                infinity.money < 0d ||
                !FacilityCountAccessor.TryGetCount(
                    infinity,
                    rule.FacilityId,
                    out double[] counts) ||
                counts == null ||
                counts.Length < 2 ||
                !NumericSafety.IsFinite(counts[1]) ||
                counts[1] < 0d)
            {
                return false;
            }

            double modifiedBaseCost = rule.BaseCost;
            if (rule.UseAssemblyMegaDiscount &&
                skills != null &&
                skills.assemblyMegaLines &&
                FacilityCountAccessor.TryGetCount(
                    infinity,
                    "planets",
                    out double[] planets) &&
                planets != null &&
                planets.Length >= 2)
            {
                double totalPlanets = NumericSafety.Add(
                    NumericSafety.ClampContinuous(planets[0]),
                    NumericSafety.ClampContinuous(planets[1])).Value;
                if (totalPlanets > 0d)
                {
                    NumericResult<double> discounted =
                        NumericSafety.Divide(
                            modifiedBaseCost,
                            totalPlanets);
                    if (!discounted.IsSuccess ||
                        discounted.Value <= 0d)
                    {
                        return false;
                    }
                    modifiedBaseCost = discounted.Value;
                }
            }

            double costLevel = rule.SubtractRetainedTen
                ? Math.Max(0d, counts[1] - 10d)
                : counts[1];
            long affordable = CalcUtils.MaxAffordableLong(
                infinity.money,
                modifiedBaseCost,
                rule.CostExponent,
                costLevel);
            affordable = Math.Min(
                Math.Max(0L, affordable),
                Math.Max(0L, rule.MaximumQuantity));
            BuyMode mode = policy ==
                           SimulationAutomationPolicy.ForceBuyMax
                ? BuyMode.BuyMax
                : settings.buyMode;
            long owned = NumericSafety.ToLongFloor(counts[1]).Value;
            long selected = BuyModeHelper.GetAmountToBuy(
                mode,
                settings.roundedBulkBuy,
                owned,
                affordable);
            selected = Math.Min(
                selected,
                Math.Max(0L, rule.MaximumQuantity));
            if (selected <= 0L) return false;

            double cost = CalcUtils.BuyXCost(
                selected,
                modifiedBaseCost,
                rule.CostExponent,
                costLevel);
            NumericResult<double> ownership =
                NumericSafety.Add(counts[1], selected);
            if (!ownership.IsSuccess ||
                ownership.Value <= counts[1])
            {
                return false;
            }

            DebitResult debit = EconomyTransaction.TryDebit(
                infinity.money,
                cost,
                selected);
            if (!debit.Succeeded) return false;

            infinity.money = debit.Balance;
            counts[1] = ownership.Value;
            quantity = selected;
            return true;
        }

        public static bool TryPurchaseResearch(
            SaveDataSettings settings,
            ResearchAutomationRule rule,
            SimulationAutomationPolicy policy,
            out long quantity)
        {
            quantity = 0L;
            if (settings == null ||
                string.IsNullOrEmpty(rule.ResearchId) ||
                !IsResearchAutomationEnabled(settings, rule.AutoBuyGroup) ||
                !HasResearchPrerequisites(settings, rule) ||
                !NumericSafety.IsFinite(rule.BaseCost) ||
                rule.BaseCost <= 0d ||
                !NumericSafety.IsFinite(rule.Exponent) ||
                rule.Exponent <= 0d)
            {
                return false;
            }

            DysonVerseInfinityData infinity =
                settings.dysonVerseSaveData?.dysonVerseInfinityData;
            DysonVerseSkillTreeData skills =
                settings.dysonVerseSaveData?.dysonVerseSkillTreeData;
            if (infinity == null ||
                !NumericSafety.IsFinite(infinity.science) ||
                infinity.science < 0d)
            {
                return false;
            }

            infinity.researchLevelsById ??=
                new Dictionary<string, double>();
            infinity.researchLevelsById.TryGetValue(
                rule.ResearchId,
                out double currentLevel);
            if (!NumericSafety.IsFinite(currentLevel) ||
                currentLevel < 0d ||
                (rule.MaxLevel >= 0 &&
                 currentLevel >= rule.MaxLevel))
            {
                return false;
            }

            double costBase = rule.BaseCost;
            if (skills != null &&
                skills.repeatableResearch &&
                rule.PercentPerLevel > 0d)
            {
                NumericResult<double> boost =
                    NumericSafety.Multiply(
                        currentLevel,
                        rule.PercentPerLevel);
                NumericResult<double> divisor =
                    NumericSafety.Add(1d, boost.Value);
                NumericResult<double> repeatableBase =
                    NumericSafety.Divide(
                        rule.BaseCost,
                        divisor.Value);
                if (!repeatableBase.IsSuccess ||
                    repeatableBase.Value <= 0d)
                {
                    return false;
                }
                costBase = repeatableBase.Value;
            }

            bool linear =
                Math.Abs(rule.Exponent - 1d) <=
                ExponentEpsilon;
            long affordable = linear
                ? NumericSafety.ToLongFloor(
                    NumericSafety.Divide(
                        infinity.science,
                        costBase).Value).Value
                : CalcUtils.MaxAffordableLong(
                    infinity.science,
                    costBase,
                    rule.Exponent,
                    currentLevel);
            affordable = ClampResearchRemaining(
                affordable,
                currentLevel,
                rule.MaxLevel);

            BuyMode mode = policy ==
                           SimulationAutomationPolicy.ForceBuyMax
                ? BuyMode.BuyMax
                : settings.researchBuyMode;
            long owned =
                NumericSafety.ToLongFloor(currentLevel).Value;
            long selected = BuyModeHelper.GetAmountToBuy(
                mode,
                settings.researchRoundedBulkBuy,
                owned,
                affordable);
            selected = ClampResearchRemaining(
                selected,
                currentLevel,
                rule.MaxLevel);
            if (selected <= 0L) return false;

            double cost = linear
                ? NumericSafety.Multiply(
                    costBase,
                    selected).Value
                : CalcUtils.BuyXCost(
                    selected,
                    costBase,
                    rule.Exponent,
                    currentLevel);
            NumericResult<double> nextLevel =
                NumericSafety.Add(currentLevel, selected);
            if (!nextLevel.IsSuccess ||
                nextLevel.Value <= currentLevel)
            {
                return false;
            }
            if (rule.MaxLevel >= 0)
            {
                nextLevel = new NumericResult<double>(
                    Math.Min(rule.MaxLevel, nextLevel.Value),
                    nextLevel.Status);
            }

            DebitResult debit = EconomyTransaction.TryDebit(
                infinity.science,
                cost,
                selected);
            if (!debit.Succeeded) return false;

            infinity.science = debit.Balance;
            infinity.researchLevelsById[rule.ResearchId] =
                nextLevel.Value;
            quantity = selected;
            return true;
        }

        private static bool HasResearchPrerequisites(
            SaveDataSettings settings,
            ResearchAutomationRule rule)
        {
            DysonVerseInfinityData infinity =
                settings.dysonVerseSaveData?.dysonVerseInfinityData;
            if (infinity == null) return false;

            if (rule.PrerequisiteResearchIds != null)
            {
                for (int i = 0;
                     i < rule.PrerequisiteResearchIds.Length;
                     i++)
                {
                    string prerequisite =
                        rule.PrerequisiteResearchIds[i];
                    if (string.IsNullOrEmpty(prerequisite))
                        continue;
                    if (infinity.researchLevelsById == null ||
                        !infinity.researchLevelsById.TryGetValue(
                            prerequisite,
                            out double level) ||
                        level <= 0d)
                    {
                        return false;
                    }
                }
            }

            if (string.IsNullOrEmpty(
                    rule.PrerequisiteFacilityId))
            {
                return true;
            }
            if (!FacilityCountAccessor.TryGetCount(
                    infinity,
                    rule.PrerequisiteFacilityId,
                    out double[] counts) ||
                counts == null ||
                counts.Length < 2)
            {
                return false;
            }
            double required =
                rule.PrerequisiteFacilityOwned > 0d
                    ? rule.PrerequisiteFacilityOwned
                    : 1d;
            return NumericSafety.Add(
                NumericSafety.ClampContinuous(counts[0]),
                NumericSafety.ClampContinuous(counts[1])).Value >=
                   required;
        }

        private static bool IsResearchAutomationEnabled(
            SaveDataSettings settings,
            ResearchAutoBuyGroup group)
        {
            DysonVersePrestigeData prestige =
                settings.dysonVerseSaveData
                    ?.dysonVersePrestigeData;
            if (prestige == null ||
                !prestige.infinityAutoResearch)
            {
                return false;
            }

            return group switch
            {
                ResearchAutoBuyGroup.None => true,
                ResearchAutoBuyGroup.Science =>
                    settings.infinityAutoResearchToggleScience,
                ResearchAutoBuyGroup.Money =>
                    settings.infinityAutoResearchToggleMoney,
                ResearchAutoBuyGroup.Assembly =>
                    settings.infinityAutoResearchToggleAssembly,
                ResearchAutoBuyGroup.Ai =>
                    settings.infinityAutoResearchToggleAi,
                ResearchAutoBuyGroup.Server =>
                    settings.infinityAutoResearchToggleServer,
                ResearchAutoBuyGroup.DataCenter =>
                    settings.infinityAutoResearchToggleDataCenter,
                ResearchAutoBuyGroup.Planet =>
                    settings.infinityAutoResearchTogglePlanet,
                ResearchAutoBuyGroup.MatrioshkaBrains =>
                    settings
                        .infinityAutoResearchToggleMatrioshkaBrains,
                ResearchAutoBuyGroup.BirchPlanets =>
                    settings
                        .infinityAutoResearchToggleBirchPlanets,
                ResearchAutoBuyGroup.GalacticBrains =>
                    settings
                        .infinityAutoResearchToggleGalacticBrains,
                _ => false
            };
        }

        private static long ClampResearchRemaining(
            long amount,
            double currentLevel,
            int maxLevel)
        {
            amount = Math.Max(0L, amount);
            if (maxLevel < 0) return amount;
            double remaining = maxLevel - currentLevel;
            if (remaining <= 0d) return 0L;
            long wholeRemaining =
                NumericSafety.ToLongFloor(remaining).Value;
            return Math.Min(amount, wholeRemaining);
        }
    }
}
