using static Expansion.Oracle;

using Blindsided.Utilities;

namespace Systems
{
    public static class StaticMethods
    {
        public static double FillBar(double buildings, double duration, double multi, double time) => duration / multi < 0.8f ? 1 : buildings > 0 ? time / duration : 0;

        public static string TimerText(double buildings, double duration, double multi, double time, bool mspace = false, string colourOverride = "")
        {
            if (duration / multi < 0.8f)
                return $"{CalcUtils.FormatNumber(1 / (duration / multi), useMspace: mspace, colourOverride: colourOverride)}/s";

            if (buildings > 0)
            {
                double remaining = duration / multi - time / multi;
                return $"{CalcUtils.FormatNumber(remaining, useMspace: mspace, colourOverride: colourOverride)}s";
            }

            return "";
        }

        public static int InfinityPointsToGain(double botsRequired, double bots) => BuyMultiple.MaxAffordable(bots, botsRequired, oracle.infinityExponent, 0);
    }
}
