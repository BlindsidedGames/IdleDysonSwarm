using System;
using System.Globalization;
using Expansion;

namespace Systems.Save
{
    /*
     * OfflineAwayTimeCalculator
     * Purpose (runtime): Canonical away-time resolution from save timestamps with UTC parsing and clamping.
     * Runs: Runtime and editor tests.
     * Primary entry points:
     * - Compute(Oracle.SaveDataSettings)
     * - TryParseUtc(string, out DateTime)
     * Owns vs delegates:
     * - Owns date-source selection (quit string -> dateStarted fallback -> runtime fallback) and away-time math.
     * - Delegates current-time retrieval to IClock.
     *
     * Interacts with:
     * - Expansion.Oracle.Persistence (AwayForSeconds flow)
     * - Systems.Save.IClock
     * - Editor tests in Assets/Editor/Tests/Systems/**
     *
     * Change notes:
     * - Source selection and clamping behavior define offline grant correctness; changes require updating regression tests.
     * - Parsing must remain UTC-normalized for cross-timezone/device consistency.
     */
    public sealed class OfflineAwayTimeCalculator
    {
        public enum AwayTimeSource
        {
            MissingQuitString,
            QuitString,
            DateStartedFallback,
            RuntimeUtcFallback
        }

        public readonly struct AwayTimeComputation
        {
            public AwayTimeComputation(
                AwayTimeSource source,
                DateTime resolvedStartUtc,
                DateTime nowUtc,
                float rawSeconds,
                float clampedSeconds)
            {
                Source = source;
                ResolvedStartUtc = resolvedStartUtc;
                NowUtc = nowUtc;
                RawSeconds = rawSeconds;
                ClampedSeconds = clampedSeconds;
            }

            public AwayTimeSource Source { get; }
            public DateTime ResolvedStartUtc { get; }
            public DateTime NowUtc { get; }
            public float RawSeconds { get; }
            public float ClampedSeconds { get; }

            public bool HasQuitTimestampInput => Source != AwayTimeSource.MissingQuitString;

            public string SourceLabel
            {
                get
                {
                    switch (Source)
                    {
                        case AwayTimeSource.QuitString:
                            return "quitString";
                        case AwayTimeSource.DateStartedFallback:
                            return "dateStartedFallback";
                        case AwayTimeSource.RuntimeUtcFallback:
                            return "runtimeUtcFallback";
                        default:
                            return "missingQuitString";
                    }
                }
            }
        }

        private readonly IClock _clock;

        public OfflineAwayTimeCalculator(IClock clock)
        {
            _clock = clock ?? throw new ArgumentNullException(nameof(clock));
        }

        public AwayTimeComputation Compute(Oracle.SaveDataSettings settings)
        {
            if (settings == null) throw new ArgumentNullException(nameof(settings));

            DateTime nowUtc = _clock.UtcNow;
            if (string.IsNullOrEmpty(settings.dateQuitString))
            {
                return new AwayTimeComputation(
                    AwayTimeSource.MissingQuitString,
                    nowUtc,
                    nowUtc,
                    0f,
                    0f);
            }

            AwayTimeSource source = AwayTimeSource.QuitString;
            if (!TryParseUtc(settings.dateQuitString, out DateTime resolvedStartUtc))
            {
                source = AwayTimeSource.DateStartedFallback;
                if (!TryParseUtc(settings.dateStarted, out resolvedStartUtc))
                {
                    source = AwayTimeSource.RuntimeUtcFallback;
                    resolvedStartUtc = nowUtc;
                }
            }

            float rawSeconds = (float)(nowUtc - resolvedStartUtc).TotalSeconds;
            float clampedSeconds = Math.Max(0f, rawSeconds);
            return new AwayTimeComputation(source, resolvedStartUtc, nowUtc, rawSeconds, clampedSeconds);
        }

        public static bool TryParseUtc(string value, out DateTime result)
        {
            return DateTime.TryParse(
                value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out result);
        }
    }
}
