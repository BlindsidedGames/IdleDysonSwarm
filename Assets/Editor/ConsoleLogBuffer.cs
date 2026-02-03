using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

[InitializeOnLoad]
internal static class ConsoleLogBuffer
{
    [Flags]
    private enum LogTypeMask
    {
        Log = 1 << 0,
        Warning = 1 << 1,
        Error = 1 << 2,
        All = Log | Warning | Error
    }

    private const int MaxEntries = 1000;
    private const int MaxStackChars = 4000;
    private const string FilterKey = "IdleDysonSwarm.ConsoleLogBuffer.FilterMask";

    private static readonly List<ConsoleEntry> Entries = new List<ConsoleEntry>(MaxEntries);
    private static readonly object Sync = new object();
    private static int _pendingWrite;
    private static readonly string OutputPath;

    static ConsoleLogBuffer()
    {
        OutputPath = Path.Combine(GetProjectRoot(), "Documentation", "Console", "editor-console.json");
        Directory.CreateDirectory(Path.GetDirectoryName(OutputPath) ?? GetProjectRoot());

        ClearBuffer("Editor start");
        Application.logMessageReceivedThreaded += OnLogThreaded;
        EditorApplication.update += OnEditorUpdate;
        EditorApplication.quitting += OnEditorQuitting;
    }

    [MenuItem("Tools/Console Log Buffer/Clear")]
    private static void ClearMenu()
    {
        ClearBuffer("Manual clear");
    }

    [MenuItem("Tools/Console Log Buffer/Filter/Include Logs")]
    private static void ToggleIncludeLogs()
    {
        ToggleFilter(LogTypeMask.Log);
    }

    [MenuItem("Tools/Console Log Buffer/Filter/Include Logs", true)]
    private static bool ToggleIncludeLogsValidate()
    {
        return ValidateFilterMenu(LogTypeMask.Log);
    }

    [MenuItem("Tools/Console Log Buffer/Filter/Include Warnings")]
    private static void ToggleIncludeWarnings()
    {
        ToggleFilter(LogTypeMask.Warning);
    }

    [MenuItem("Tools/Console Log Buffer/Filter/Include Warnings", true)]
    private static bool ToggleIncludeWarningsValidate()
    {
        return ValidateFilterMenu(LogTypeMask.Warning);
    }

    [MenuItem("Tools/Console Log Buffer/Filter/Include Errors")]
    private static void ToggleIncludeErrors()
    {
        ToggleFilter(LogTypeMask.Error);
    }

    [MenuItem("Tools/Console Log Buffer/Filter/Include Errors", true)]
    private static bool ToggleIncludeErrorsValidate()
    {
        return ValidateFilterMenu(LogTypeMask.Error);
    }

    private static void OnEditorQuitting()
    {
        Application.logMessageReceivedThreaded -= OnLogThreaded;
        EditorApplication.update -= OnEditorUpdate;
    }

    private static void OnLogThreaded(string condition, string stackTrace, LogType type)
    {
        var entry = new ConsoleEntry
        {
            timeUtc = DateTime.UtcNow.ToString("O"),
            type = type.ToString(),
            message = condition ?? string.Empty,
            stackTrace = TrimStack(stackTrace)
        };

        lock (Sync)
        {
            if (Entries.Count >= MaxEntries)
            {
                Entries.RemoveAt(0);
            }

            Entries.Add(entry);
        }

        System.Threading.Interlocked.Exchange(ref _pendingWrite, 1);
    }

    private static void OnEditorUpdate()
    {
        if (System.Threading.Interlocked.Exchange(ref _pendingWrite, 0) == 0)
        {
            return;
        }

        WriteToDisk();
    }

    private static void WriteToDisk()
    {
        ConsoleEntryList snapshot;
        var filter = GetFilterMask();
        lock (Sync)
        {
            snapshot = new ConsoleEntryList
            {
                updatedAtUtc = DateTime.UtcNow.ToString("O"),
                maxEntries = MaxEntries,
                filterMask = (int)filter,
                entries = FilterEntries(Entries, filter)
            };
        }

        try
        {
            var json = JsonUtility.ToJson(snapshot, true);
            File.WriteAllText(OutputPath, json);
        }
        catch (Exception ex)
        {
            Debug.LogWarning($"ConsoleLogBuffer failed to write: {ex.Message}");
        }
    }

    private static void ClearBuffer(string reason)
    {
        lock (Sync)
        {
            Entries.Clear();
        }

        var snapshot = new ConsoleEntryList
        {
            updatedAtUtc = DateTime.UtcNow.ToString("O"),
            maxEntries = MaxEntries,
            clearedReason = reason,
            filterMask = (int)GetFilterMask(),
            entries = new List<ConsoleEntry>()
        };

        try
        {
            var json = JsonUtility.ToJson(snapshot, true);
            File.WriteAllText(OutputPath, json);
        }
        catch (Exception ex)
        {
            Debug.LogWarning($"ConsoleLogBuffer failed to clear: {ex.Message}");
        }
    }

    private static string TrimStack(string stackTrace)
    {
        if (string.IsNullOrEmpty(stackTrace))
        {
            return string.Empty;
        }

        if (stackTrace.Length <= MaxStackChars)
        {
            return stackTrace;
        }

        return stackTrace.Substring(0, MaxStackChars) + " ...(truncated)";
    }

    private static string GetProjectRoot()
    {
        var assetsPath = Application.dataPath.Replace('\\', '/');
        var lastSlash = assetsPath.LastIndexOf('/');
        return lastSlash > 0 ? assetsPath.Substring(0, lastSlash) : assetsPath;
    }

    [Serializable]
    private sealed class ConsoleEntry
    {
        public string timeUtc;
        public string type;
        public string message;
        public string stackTrace;
    }

    [Serializable]
    private sealed class ConsoleEntryList
    {
        public string updatedAtUtc;
        public int maxEntries;
        public string clearedReason;
        public int filterMask;
        public List<ConsoleEntry> entries;
    }

    private static void ToggleFilter(LogTypeMask flag)
    {
        var mask = GetFilterMask();
        if ((mask & flag) == flag)
        {
            mask &= ~flag;
        }
        else
        {
            mask |= flag;
        }

        if (mask == 0)
        {
            mask = LogTypeMask.Error;
        }

        SetFilterMask(mask);
        WriteToDisk();
    }

    private static bool ValidateFilterMenu(LogTypeMask flag)
    {
        var mask = GetFilterMask();
        Menu.SetChecked(GetFilterMenuPath(flag), (mask & flag) == flag);
        return true;
    }

    private static string GetFilterMenuPath(LogTypeMask flag)
    {
        switch (flag)
        {
            case LogTypeMask.Log:
                return "Tools/Console Log Buffer/Filter/Include Logs";
            case LogTypeMask.Warning:
                return "Tools/Console Log Buffer/Filter/Include Warnings";
            case LogTypeMask.Error:
                return "Tools/Console Log Buffer/Filter/Include Errors";
            default:
                return "Tools/Console Log Buffer/Filter";
        }
    }

    private static LogTypeMask GetFilterMask()
    {
        return (LogTypeMask)EditorPrefs.GetInt(FilterKey, (int)LogTypeMask.All);
    }

    private static void SetFilterMask(LogTypeMask mask)
    {
        EditorPrefs.SetInt(FilterKey, (int)mask);
    }

    private static List<ConsoleEntry> FilterEntries(List<ConsoleEntry> source, LogTypeMask mask)
    {
        if (mask == LogTypeMask.All)
        {
            return new List<ConsoleEntry>(source);
        }

        var filtered = new List<ConsoleEntry>(source.Count);
        for (var i = 0; i < source.Count; i++)
        {
            var entry = source[i];
            if (IsIncluded(entry.type, mask))
            {
                filtered.Add(entry);
            }
        }

        return filtered;
    }

    private static bool IsIncluded(string type, LogTypeMask mask)
    {
        if (string.Equals(type, LogType.Log.ToString(), StringComparison.Ordinal))
        {
            return (mask & LogTypeMask.Log) == LogTypeMask.Log;
        }

        if (string.Equals(type, LogType.Warning.ToString(), StringComparison.Ordinal))
        {
            return (mask & LogTypeMask.Warning) == LogTypeMask.Warning;
        }

        return (mask & LogTypeMask.Error) == LogTypeMask.Error;
    }
}
