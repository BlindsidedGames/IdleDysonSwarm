using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

public sealed class AndroidSteamPluginExcluder : IPreprocessBuildWithReport
{
    private const string SteamPackagePath = "com.rlabrecque.steamworks.net";
    private const string SteamAndroidLibSuffix = "/Plugins/androidarm64/libsteam_api.so";

    public int callbackOrder => -1000;

    [MenuItem("Tools/Build/Android/Exclude Steamworks Native Plugin")]
    private static void ExcludeSteamworksPluginMenuItem()
    {
        int changed = DisableSteamworksAndroidPlugin();
        Debug.Log(changed > 0
            ? $"Disabled Steamworks Android plugin import on {changed} asset(s)."
            : "Steamworks Android plugin import was already disabled.");
    }

    public void OnPreprocessBuild(BuildReport report)
    {
        if (report.summary.platform != BuildTarget.Android)
        {
            return;
        }

        int changed = DisableSteamworksAndroidPlugin();
        if (changed > 0)
        {
            Debug.Log($"Disabled Steamworks Android plugin import on {changed} asset(s) before Android build.");
        }
    }

    private static int DisableSteamworksAndroidPlugin()
    {
        string[] candidates = AssetDatabase.FindAssets("libsteam_api")
            .Select(AssetDatabase.GUIDToAssetPath)
            .Where(path => path.Contains(SteamPackagePath) && path.EndsWith(SteamAndroidLibSuffix))
            .ToArray();

        int changed = 0;
        foreach (string path in candidates)
        {
            if (AssetImporter.GetAtPath(path) is not PluginImporter importer)
            {
                continue;
            }

            if (!importer.GetCompatibleWithPlatform(BuildTarget.Android))
            {
                continue;
            }

            importer.SetCompatibleWithPlatform(BuildTarget.Android, false);
            importer.SaveAndReimport();
            changed++;
        }

        return changed;
    }
}
