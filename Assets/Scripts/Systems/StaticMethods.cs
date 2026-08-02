using static Expansion.Oracle;

using Blindsided.Utilities;
using Systems.Debugging;
using Systems.Numeric;

namespace Systems
{
    public static class StaticMethods
    {
        public static double FillBar(double buildings, double duration, double multi, double time)
        {
            if (!NumericSafety.IsFinite(buildings) ||
                !NumericSafety.IsFinite(duration) ||
                !NumericSafety.IsFinite(multi) ||
                !NumericSafety.IsFinite(time) ||
                buildings < 0d ||
                duration <= 0d ||
                multi < 0d)
            {
                NumericDiagnostics.Report("NS-UI-TIMER", "operation=fill");
                return 0d;
            }
            if (buildings == 0d) return 0d;
            if (multi == 0d)
            {
                NumericDiagnostics.Report("NS-UI-TIMER", "operation=fill");
                return 0d;
            }

            NumericResult<double> effectiveDuration = NumericSafety.Divide(duration, multi);
            if (!effectiveDuration.IsSuccess) return 0d;
            if (effectiveDuration.Value < 0.8d) return 1d;
            if (buildings <= 0d) return 0d;
            return System.Math.Max(0d, System.Math.Min(1d, time / duration));
        }

        public static string TimerText(double buildings, double duration, double multi, double time, bool mspace = false, string colourOverride = "")
        {
            if (!NumericSafety.IsFinite(buildings) ||
                !NumericSafety.IsFinite(duration) ||
                !NumericSafety.IsFinite(multi) ||
                !NumericSafety.IsFinite(time) ||
                buildings < 0d ||
                duration <= 0d ||
                multi < 0d)
            {
                NumericDiagnostics.Report("NS-UI-TIMER", "operation=text");
                return "ERR";
            }
            if (buildings == 0d) return "";
            if (multi == 0d)
            {
                NumericDiagnostics.Report("NS-UI-TIMER", "operation=text");
                return "ERR";
            }

            NumericResult<double> effectiveDuration = NumericSafety.Divide(duration, multi);
            if (!effectiveDuration.IsSuccess) return "ERR";
            if (effectiveDuration.Value < 0.8d)
            {
                NumericResult<double> completions = NumericSafety.Divide(1d, effectiveDuration.Value);
                return $"{CalcUtils.FormatNumber(completions.Value, useMspace: mspace, colourOverride: colourOverride)}/s";
            }

            if (buildings > 0)
            {
                double remaining = System.Math.Max(0d, (duration - time) / multi);
                return $"{CalcUtils.FormatNumber(remaining, useMspace: mspace, colourOverride: colourOverride)}s";
            }

            return "";
        }

        public static long InfinityPointsToGain(double botsRequired, double bots) =>
            CalcUtils.MaxAffordableLong(bots, botsRequired, oracle.infinityExponent, 0);
    }
}
