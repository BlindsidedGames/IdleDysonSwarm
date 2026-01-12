using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;

namespace Systems.Stats
{
    public static class StatCalculator
    {
        public static StatResult Calculate(double baseValue, IEnumerable<StatEffect> effects)
        {
            if (!StatTimingTracker.Enabled)
            {
                return CalculateInternal(baseValue, effects, out _, out _);
            }

            long start = Stopwatch.GetTimestamp();
            StatResult timedResult = CalculateInternal(baseValue, effects, out string label, out int effectCount);
            long elapsed = Stopwatch.GetTimestamp() - start;
            StatTimingTracker.Record(label, elapsed, effectCount);
            return timedResult;
        }

        private static StatResult CalculateInternal(double baseValue, IEnumerable<StatEffect> effects,
            out string label, out int effectCount)
        {
            var result = new StatResult { Value = baseValue };
            result.Contributions.Add(new Contribution
            {
                SourceName = "Base",
                Operation = StatOperation.Override,
                Value = baseValue,
                Delta = baseValue,
                Order = int.MinValue
            });

            label = "stat.none";
            effectCount = 0;

            if (effects == null)
            {
                return result;
            }

            var ordered = effects.OrderBy(effect => effect.Order).ToList();
            effectCount = ordered.Count;
            if (ordered.Count > 0 && !string.IsNullOrEmpty(ordered[0].TargetStatId))
            {
                label = ordered[0].TargetStatId;
            }

            ApplyEffects(result, ordered);

            return result;
        }

        private static void ApplyEffects(StatResult result, IEnumerable<StatEffect> effects)
        {
            foreach (StatEffect effect in effects)
            {
                double before = result.Value;
                double after = ApplyOperation(before, effect);

                result.Value = after;
                result.Contributions.Add(new Contribution
                {
                    SourceId = effect.Id,
                    SourceName = string.IsNullOrEmpty(effect.SourceName) ? effect.Id : effect.SourceName,
                    Operation = effect.Operation,
                    Value = effect.Value,
                    Delta = after - before,
                    Order = effect.Order
                });
            }
        }

        private static double ApplyOperation(double current, StatEffect effect)
        {
            switch (effect.Operation)
            {
                case StatOperation.Add:
                    return current + effect.Value;
                case StatOperation.Multiply:
                    return current * effect.Value;
                case StatOperation.Power:
                    return Math.Pow(current, effect.Value);
                case StatOperation.Override:
                    return effect.Value;
                case StatOperation.ClampMin:
                    return Math.Max(current, effect.Value);
                case StatOperation.ClampMax:
                    return Math.Min(current, effect.Value);
                default:
                    return current;
            }
        }
    }
}
