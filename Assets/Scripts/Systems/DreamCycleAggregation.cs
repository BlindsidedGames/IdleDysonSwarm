using System;
using System.Collections.Generic;
using System.Reflection;
using Systems.Numeric;
using static Expansion.Oracle;

namespace Systems.Simulation
{
    /// <summary>
    /// Observes exact Dream resets and exposes an aggregate only after three
    /// consecutive cycles prove that duration, reward, cause, and complete
    /// post-reset state are identical.
    /// </summary>
    public sealed class DreamCycleTracker
    {
        private const double DurationTolerance = 1e-9d;
        private readonly List<DreamCycleSample> _samples = new(3);
        private DreamStateSignature _postResetSignature;

        public double SecondsInCurrentCycle { get; private set; }
        public bool IsAtPostResetStart =>
            _postResetSignature != null &&
            SecondsInCurrentCycle <= 1e-12d;

        public void AddElapsed(double seconds)
        {
            if (!NumericSafety.IsFinite(seconds) || seconds <= 0d)
                return;
            SecondsInCurrentCycle = NumericSafety.Add(
                SecondsInCurrentCycle,
                seconds).Value;
        }

        public void ObserveReset(
            long countBefore,
            long strangeMatterBefore,
            DreamResetCause cause,
            SaveDataDream1 dream,
            SaveDataPrestige prestige)
        {
            if (prestige == null ||
                prestige.simulationCount <= countBefore)
            {
                return;
            }

            var signature = DreamStateSignature.Capture(
                dream,
                prestige);
            if (_postResetSignature != null &&
                _postResetSignature.Equals(signature) &&
                SecondsInCurrentCycle > 0d)
            {
                _samples.Add(
                    new DreamCycleSample(
                        SecondsInCurrentCycle,
                        Math.Max(
                            0L,
                            prestige.strangeMatter -
                            strangeMatterBefore),
                        cause));
                if (_samples.Count > 3)
                    _samples.RemoveAt(0);
            }
            else
            {
                _samples.Clear();
            }

            _postResetSignature = signature;
            SecondsInCurrentCycle = 0d;
        }

        public bool TryGetStableCycle(
            SaveDataDream1 dream,
            SaveDataPrestige prestige,
            out double durationSeconds,
            out long reward,
            out DreamResetCause cause)
        {
            durationSeconds = 0d;
            reward = 0L;
            cause = default;
            if (!IsAtPostResetStart ||
                _samples.Count < 3 ||
                !_postResetSignature.Equals(
                    DreamStateSignature.Capture(
                        dream,
                        prestige)))
            {
                return false;
            }

            DreamCycleSample first = _samples[0];
            for (int index = 1; index < _samples.Count; index++)
            {
                DreamCycleSample sample = _samples[index];
                double scale = Math.Max(
                    1d,
                    Math.Max(
                        first.DurationSeconds,
                        sample.DurationSeconds));
                if (Math.Abs(
                        first.DurationSeconds -
                        sample.DurationSeconds) >
                    scale * DurationTolerance ||
                    first.Reward != sample.Reward ||
                    first.Cause != sample.Cause)
                {
                    return false;
                }
            }

            durationSeconds = first.DurationSeconds;
            reward = first.Reward;
            cause = first.Cause;
            return NumericSafety.IsFinite(durationSeconds) &&
                   durationSeconds > 0d;
        }

        public void AcceptAggregate()
        {
            SecondsInCurrentCycle = 0d;
        }

        private readonly struct DreamCycleSample
        {
            public DreamCycleSample(
                double durationSeconds,
                long reward,
                DreamResetCause cause)
            {
                DurationSeconds = durationSeconds;
                Reward = reward;
                Cause = cause;
            }

            public double DurationSeconds { get; }
            public long Reward { get; }
            public DreamResetCause Cause { get; }
        }

        private sealed class DreamStateSignature
        {
            private static readonly FieldInfo[] DreamFields =
                typeof(SaveDataDream1).GetFields(
                    BindingFlags.Instance |
                    BindingFlags.Public);
            private static readonly FieldInfo[] PrestigeFields =
                typeof(SaveDataPrestige).GetFields(
                    BindingFlags.Instance |
                    BindingFlags.Public);
            private readonly object[] _values;

            private DreamStateSignature(object[] values)
            {
                _values = values;
            }

            public static DreamStateSignature Capture(
                SaveDataDream1 dream,
                SaveDataPrestige prestige)
            {
                var values = new List<object>(
                    DreamFields.Length +
                    PrestigeFields.Length);
                for (int index = 0;
                     index < DreamFields.Length;
                     index++)
                {
                    values.Add(
                        dream == null
                            ? null
                            : DreamFields[index].GetValue(dream));
                }
                for (int index = 0;
                     index < PrestigeFields.Length;
                     index++)
                {
                    FieldInfo field = PrestigeFields[index];
                    if (field.Name == nameof(
                            SaveDataPrestige.simulationCount) ||
                        field.Name == nameof(
                            SaveDataPrestige.strangeMatter) ||
                        field.Name == nameof(
                            SaveDataPrestige.doubleTime) ||
                        field.Name == nameof(
                            SaveDataPrestige.doDoubleTime))
                    {
                        continue;
                    }
                    values.Add(
                        prestige == null
                            ? null
                            : field.GetValue(prestige));
                }
                return new DreamStateSignature(values.ToArray());
            }

            public override bool Equals(object obj)
            {
                if (obj is not DreamStateSignature other ||
                    other._values.Length != _values.Length)
                {
                    return false;
                }
                for (int index = 0;
                     index < _values.Length;
                     index++)
                {
                    if (!Equals(
                            _values[index],
                            other._values[index]))
                    {
                        return false;
                    }
                }
                return true;
            }

            public override int GetHashCode()
            {
                var hash = new HashCode();
                for (int index = 0;
                     index < _values.Length;
                     index++)
                {
                    hash.Add(_values[index]);
                }
                return hash.ToHashCode();
            }
        }
    }
}
