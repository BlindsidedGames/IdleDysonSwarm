using static Expansion.Oracle;

using Blindsided.Utilities;

namespace Systems
{
    public static class StaticMethods
    {
        public static double FillBar(double buildings, double duration, double multi, double time) => duration / multi < 0.2f ? 1 : buildings > 0 ? time / duration : 0;

        public static string TimerText(double buildings, double duration, double multi, double time) =>
            duration / multi < 0.2f
                ? $"{CalcUtils.FormatNumber(1 / (duration / multi))}/s"
                : buildings > 0
                    ? $"{duration / multi - time / multi:F1}s"
                    : "";

        public static int InfinityPointsToGain(double botsRequired, double bots) => BuyMultiple.MaxAffordable(bots, botsRequired, oracle.infinityExponent, 0);
    }
}
