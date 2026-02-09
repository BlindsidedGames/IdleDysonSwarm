using UnityEngine;

/// <summary>
/// ProgressBarFlickerManager
/// Runtime: yes (static utility).
///
/// Purpose:
/// Centralizes the rule for whether a progress bar should appear "solid" (full)
/// versus "progressing" (showing fractional fill).
///
/// Primary entry points:
/// - <see cref="SolidFillThresholdPerSecond"/>: global threshold in "completions per second".
/// - <see cref="ShouldRenderSolid(double)"/>
/// - <see cref="ComputeFillAmount(double, double)"/>
///
/// Interacts with:
/// - UnityEngine.PlayerPrefs (persists threshold for balancing/config).
///
/// Change notes:
/// - Changing <see cref="SolidFillThresholdPerSecondPrefKey"/> breaks existing saved preferences.
/// - The semantic meaning of "completions per second" must match the values passed by callers
///   (typically facility production rates).
/// </summary>
public static class ProgressBarFlickerManager
{
    // Intentionally explicit and stable: used in PlayerPrefs across versions.
    public const string SolidFillThresholdPerSecondPrefKey = "progress_bars.solid_threshold_per_second";

    // Default used when PlayerPrefs doesn't have a value yet.
    public const float DefaultSolidFillThresholdPerSecond = 4f;

    /// <summary>
    /// Global threshold (in completions per second) at or above which progress bars should be rendered solid.
    /// Stored in PlayerPrefs for easy balancing.
    /// </summary>
    public static float SolidFillThresholdPerSecond
    {
        get => PlayerPrefs.GetFloat(SolidFillThresholdPerSecondPrefKey, DefaultSolidFillThresholdPerSecond);
        set => PlayerPrefs.SetFloat(SolidFillThresholdPerSecondPrefKey, Mathf.Max(0f, value));
    }

    public static bool ShouldRenderSolid(double completionsPerSecond)
    {
        if (double.IsNaN(completionsPerSecond) || double.IsInfinity(completionsPerSecond))
            return false;

        return completionsPerSecond >= SolidFillThresholdPerSecond;
    }

    /// <summary>
    /// Returns the UI fill amount in [0..1] for a progress bar where progress is represented as a running
    /// "count" that includes a fractional part (e.g., facilityArray[0] in DysonVerseInfinityData).
    /// </summary>
    public static float ComputeFillAmount(double completionsPerSecond, double runningCountWithFraction)
    {
        if (ShouldRenderSolid(completionsPerSecond))
            return 1f;

        if (double.IsNaN(runningCountWithFraction) || double.IsInfinity(runningCountWithFraction))
            return 0f;

        double frac = runningCountWithFraction % 1.0;
        if (frac < 0)
            frac += 1.0;

        return Mathf.Clamp01((float)frac);
    }
}
