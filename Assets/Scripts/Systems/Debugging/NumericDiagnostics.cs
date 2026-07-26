/*
 * Purpose: Emits privacy-minimized, rate-limited numeric safety faults as handled exceptions.
 * Unity Diagnostics documents handled exceptions (Debug.LogException) as reportable with Essential Data.
 * Never pass raw save text, player-entered text, account data, or arbitrary exception messages as context.
 */

using System;
using System.Collections.Generic;
using UnityEngine;

namespace Systems.Debugging
{
    public static class NumericDiagnostics
    {
        private const int MaximumReportsPerCodePerWindow = 5;
        private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
        private static readonly Dictionary<string, ReportWindow> Windows =
            new Dictionary<string, ReportWindow>(StringComparer.Ordinal);

        public static void Report(string faultCode, string technicalContext = null)
        {
            if (string.IsNullOrWhiteSpace(faultCode)) return;
            string stableCode = Sanitize(faultCode, 64);
            DateTime now = DateTime.UtcNow;

            if (!Windows.TryGetValue(stableCode, out ReportWindow window) ||
                now - window.StartUtc >= Window)
            {
                window = new ReportWindow(now, 0);
            }

            if (window.Count >= MaximumReportsPerCodePerWindow) return;
            Windows[stableCode] = new ReportWindow(window.StartUtc, window.Count + 1);

            string context = Sanitize(technicalContext, 256);
            string message = string.IsNullOrEmpty(context)
                ? $"[NumericSafety:{stableCode}]"
                : $"[NumericSafety:{stableCode}] {context}";

            // EditMode migration/repair characterization should remain observable without
            // turning an expected fixture repair into a failed Unity test. Runtime faults
            // use Unity's documented handled-exception path; this exception is deliberately
            // message-only and contains no source exception, raw save, or player data.
            if (Application.isPlaying)
                Debug.LogException(new NumericSafetyFaultException(message));
            else
                Debug.Log(message);
        }

        [Serializable]
        private sealed class NumericSafetyFaultException : Exception
        {
            public NumericSafetyFaultException(string message) : base(message)
            {
            }
        }

        private static string Sanitize(string value, int maximumLength)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            string sanitized = value
                .Replace('\r', ' ')
                .Replace('\n', ' ')
                .Replace('\t', ' ');
            return sanitized.Length <= maximumLength
                ? sanitized
                : sanitized.Substring(0, maximumLength);
        }

        private readonly struct ReportWindow
        {
            public ReportWindow(DateTime startUtc, int count)
            {
                StartUtc = startUtc;
                Count = count;
            }

            public DateTime StartUtc { get; }
            public int Count { get; }
        }
    }
}
