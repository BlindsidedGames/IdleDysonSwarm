using System;
using System.Text;
using Expansion;
using Sirenix.Serialization;
using Systems.Migrations;
using UnityEditor;
using UnityEngine;
using SirenixSerializationUtility = Sirenix.Serialization.SerializationUtility;

public static class MigrationDebugMenu
{
    [MenuItem("Tools/Idle Dyson/Debug/Run Save Migration Dry-Run")]
    private static void RunSaveMigrationDryRun()
    {
        Oracle oracle = UnityEngine.Object.FindFirstObjectByType<Oracle>();
        if (oracle == null)
        {
            Debug.LogWarning("Save migration dry-run failed: no Oracle instance found in the scene.");
            return;
        }

        MigrationRunResult result = oracle.RunMigrationDryRun();
        if (result == null)
        {
            Debug.LogWarning("Save migration dry-run failed: save settings were not available.");
            return;
        }

        Debug.Log(result.ToReportString());
    }

    [MenuItem("Tools/Idle Dyson/Debug/Run Save Migration Dry-Run (Clipboard)")]
    private static void RunSaveMigrationDryRunFromClipboard()
    {
        Oracle oracle = UnityEngine.Object.FindFirstObjectByType<Oracle>();
        if (oracle == null)
        {
            Debug.LogWarning("Save migration dry-run failed: no Oracle instance found in the scene.");
            return;
        }

        string clipboard = GUIUtility.systemCopyBuffer;
        if (string.IsNullOrWhiteSpace(clipboard))
        {
            Debug.LogWarning("Save migration dry-run failed: clipboard is empty.");
            return;
        }

        if (!TryGetClipboardBytes(clipboard, out byte[] bytes))
        {
            Debug.LogWarning("Save migration dry-run failed: clipboard data was not valid base64 or JSON.");
            return;
        }

        Oracle.SaveDataSettings saveData;
        try
        {
            saveData = SirenixSerializationUtility.DeserializeValue<Oracle.SaveDataSettings>(bytes,
                Sirenix.Serialization.DataFormat.JSON);
        }
        catch (Exception ex)
        {
            Debug.LogWarning($"Save migration dry-run failed: could not deserialize save data ({ex.Message}).");
            return;
        }

        MigrationRunResult result = oracle.RunMigrationDryRun(saveData);
        if (result == null)
        {
            Debug.LogWarning("Save migration dry-run failed: save settings were not available.");
            return;
        }

        Debug.Log(result.ToReportString());
    }

    private static bool TryGetClipboardBytes(string clipboard, out byte[] bytes)
    {
        bytes = null;
        if (string.IsNullOrEmpty(clipboard))
        {
            return false;
        }

        try
        {
            bytes = Convert.FromBase64String(clipboard);
            return true;
        }
        catch (FormatException)
        {
            // Not base64, fall back to raw JSON.
        }

        bytes = Encoding.UTF8.GetBytes(clipboard);
        return true;
    }
}
