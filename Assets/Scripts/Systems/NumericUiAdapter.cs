/*
 * Purpose: Converts canonical double gameplay values to Unity float adapters without
 * allowing NaN, Infinity, or out-of-range values into UI components.
 */

using Systems.Debugging;

namespace Systems.Numeric
{
    public static class NumericUiAdapter
    {
        public static float ToUnitInterval(double value, string context)
        {
            if (!NumericSafety.IsFinite(value))
            {
                NumericDiagnostics.Report("NS-UI-NONFINITE", $"adapter={context}");
                return 0f;
            }

            if (value <= 0d) return 0f;
            if (value >= 1d) return 1f;
            return NumericSafety.ToFloat(value).Value;
        }

        public static float ToFiniteFloat(double value, string context, bool allowNegative = false)
        {
            NumericResult<float> result = NumericSafety.ToFloat(value, allowNegative);
            if (result.Status == NumericStatus.InvalidInput)
            {
                NumericDiagnostics.Report("NS-UI-NONFINITE", $"adapter={context}");
                return 0f;
            }

            return result.Value;
        }
    }
}
