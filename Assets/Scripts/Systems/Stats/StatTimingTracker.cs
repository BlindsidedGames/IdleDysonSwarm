using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Text;

namespace Systems.Stats
{
    public static class StatTimingTracker
    {
        private struct TimingStats
        {
            public int Count;
            public long TotalTicks;
            public long MaxTicks;
            public int TotalEffects;
        }

        private static readonly Dictionary<string, TimingStats> StatsByLabel = new Dictionary<string, TimingStats>();

        public static bool Enabled { get; set; }

        public static void Record(string label, long elapsedTicks, int effectCount)
        {
            if (!Enabled)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(label))
            {
                label = "stat.unknown";
            }

            StatsByLabel.TryGetValue(label, out TimingStats stats);
            stats.Count++;
            stats.TotalTicks += elapsedTicks;
            stats.TotalEffects += effectCount;
            if (elapsedTicks > stats.MaxTicks)
            {
                stats.MaxTicks = elapsedTicks;
            }

            StatsByLabel[label] = stats;
        }

        public static void Clear()
        {
            StatsByLabel.Clear();
        }

        public static string BuildReport(int maxEntries = 20)
        {
            var builder = new StringBuilder();
            if (StatsByLabel.Count == 0)
            {
                builder.AppendLine("Stat timing summary: no samples captured.");
                return builder.ToString();
            }

            builder.AppendLine("Stat timing summary:");
            builder.AppendLine($"Entries: {StatsByLabel.Count}");

            var ordered = new List<KeyValuePair<string, TimingStats>>(StatsByLabel);
            ordered.Sort((left, right) => right.Value.TotalTicks.CompareTo(left.Value.TotalTicks));

            int totalCalls = 0;
            long totalTicks = 0;
            for (int i = 0; i < ordered.Count; i++)
            {
                totalCalls += ordered[i].Value.Count;
                totalTicks += ordered[i].Value.TotalTicks;
            }

            builder.AppendLine(
                $"Total calls: {totalCalls}, Total ms: {TicksToMs(totalTicks).ToString("F3", CultureInfo.InvariantCulture)}");

            int entries = ordered.Count < maxEntries ? ordered.Count : maxEntries;
            for (int i = 0; i < entries; i++)
            {
                KeyValuePair<string, TimingStats> entry = ordered[i];
                TimingStats stats = entry.Value;
                double totalMs = TicksToMs(stats.TotalTicks);
                double avgMs = stats.Count > 0 ? totalMs / stats.Count : 0;
                double maxMs = TicksToMs(stats.MaxTicks);
                double avgEffects = stats.Count > 0 ? (double)stats.TotalEffects / stats.Count : 0;
                builder.AppendLine(
                    $"{entry.Key}: calls={stats.Count}, avg={avgMs.ToString("F3", CultureInfo.InvariantCulture)}ms, max={maxMs.ToString("F3", CultureInfo.InvariantCulture)}ms, effects~{avgEffects.ToString("F1", CultureInfo.InvariantCulture)}, total={totalMs.ToString("F3", CultureInfo.InvariantCulture)}ms");
            }

            return builder.ToString();
        }

        private static double TicksToMs(long ticks)
        {
            return ticks * 1000d / Stopwatch.Frequency;
        }
    }
}
