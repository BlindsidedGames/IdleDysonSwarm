using Expansion;
using Systems.Debugging;
using Systems.Stats;
using UnityEditor;
using UnityEngine;

public static class DebugTelemetryMenu
{
    [MenuItem("Tools/Idle Dyson/Debug/Log Data-Driven Breakdowns")]
    private static void LogDataDrivenBreakdowns()
    {
        Oracle oracle = UnityEngine.Object.FindFirstObjectByType<Oracle>();
        if (oracle == null)
        {
            Debug.LogWarning("Debug breakdowns failed: no Oracle instance found in the scene.");
            return;
        }

        oracle.DebugLogDataDrivenBreakdowns();
    }

    [MenuItem("Tools/Idle Dyson/Debug/Run Facility Parity Suite")]
    private static void RunFacilityParitySuite()
    {
        Oracle oracle = UnityEngine.Object.FindFirstObjectByType<Oracle>();
        if (oracle == null)
        {
            Debug.LogWarning("Facility parity suite failed: no Oracle instance found in the scene.");
            return;
        }

        oracle.DebugRunFacilityParityTests();
    }

    [MenuItem("Tools/Idle Dyson/Debug/Run Offline Progress Parity")]
    private static void RunOfflineProgressParity()
    {
        Oracle oracle = UnityEngine.Object.FindFirstObjectByType<Oracle>();
        if (oracle == null)
        {
            Debug.LogWarning("Offline parity failed: no Oracle instance found in the scene.");
            return;
        }

        oracle.DebugRunOfflineProgressParity();
    }

    [MenuItem("Tools/Idle Dyson/Debug/Export Last Debug Report")]
    private static void ExportLastDebugReport()
    {
        string path = DebugReportRecorder.ExportLastReport();
        if (string.IsNullOrEmpty(path))
        {
            Debug.LogWarning("Export failed: no debug report has been recorded yet.");
            return;
        }

        Debug.Log($"Exported debug report to {path}");
    }

    [MenuItem("Tools/Idle Dyson/Debug/Open Last Debug Report")]
    private static void OpenLastDebugReport()
    {
        string path = EnsureReportExported();
        if (string.IsNullOrEmpty(path))
        {
            Debug.LogWarning("Open failed: no debug report has been recorded yet.");
            return;
        }

        EditorUtility.RevealInFinder(path);
    }

    [MenuItem("Tools/Idle Dyson/Debug/Copy Last Debug Report Path")]
    private static void CopyLastDebugReportPath()
    {
        string path = EnsureReportExported();
        if (string.IsNullOrEmpty(path))
        {
            Debug.LogWarning("Copy failed: no debug report has been recorded yet.");
            return;
        }

        GUIUtility.systemCopyBuffer = path;
        Debug.Log($"Copied debug report path to clipboard: {path}");
    }

    [MenuItem("Tools/Idle Dyson/Debug/Toggle Stat Timing Capture")]
    private static void ToggleStatTimingCapture()
    {
        StatTimingTracker.Enabled = !StatTimingTracker.Enabled;
        Debug.Log($"Stat timing capture: {(StatTimingTracker.Enabled ? "On" : "Off")}");
    }

    [MenuItem("Tools/Idle Dyson/Debug/Clear Stat Timing Data")]
    private static void ClearStatTimingData()
    {
        StatTimingTracker.Clear();
        Debug.Log("Cleared stat timing data.");
    }

    [MenuItem("Tools/Idle Dyson/Debug/Log Stat Timing Summary")]
    private static void LogStatTimingSummary()
    {
        string report = StatTimingTracker.BuildReport();
        DebugReportRecorder.Record("Stat Timing Summary", report);
        Debug.Log(report);
    }

    private static string EnsureReportExported()
    {
        if (!string.IsNullOrEmpty(DebugReportRecorder.LastExportPath))
        {
            return DebugReportRecorder.LastExportPath;
        }

        return DebugReportRecorder.ExportLastReport();
    }
}
