using System.Globalization;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class MultiPlatformBuildMenu
{
    private const string MenuRoot = IdleDysonEditorMenu.Build;
    private const string BuildRootPath = "/Users/matthewrushworth/Builds";
    private const string GameBuildRootPath = BuildRootPath + "/Idle Dyson Swarm";
    private const string WindowsBuildPath = GameBuildRootPath + "/Windows";
    private const string AndroidBuildPath = GameBuildRootPath + "/Android";
    private const string IosBuildPath = GameBuildRootPath + "/iOS";
    private const string ProductNameFallback = "IdleDysonSwarm";

    [MenuItem(MenuRoot + "Build iOS + Android + Windows")]
    private static void BuildAllTargets()
    {
        RunAllBuilds(false);
    }

    [MenuItem(MenuRoot + "Increment Build Number + Build iOS + Android + Windows")]
    private static void IncrementAndBuildAllTargets()
    {
        RunAllBuilds(true);
    }

    [MenuItem(MenuRoot + "Increment Build Number + Build iOS + Android")]
    private static void IncrementAndBuildMobileTargets()
    {
        RunMobileBuilds(true);
    }

    [MenuItem(MenuRoot + "Sync All Build Numbers To Highest + 1")]
    private static void SyncAllBuildNumbersToHighestPlusOne()
    {
        int nextBuildNumber = SyncBuildNumbersToHighestPlusOne(includeBundleVersion: true);
        string summary =
            $"bundleVersion: {PlayerSettings.bundleVersion}\n" +
            $"Android bundleVersionCode: {PlayerSettings.Android.bundleVersionCode}\n" +
            $"iOS buildNumber: {PlayerSettings.iOS.buildNumber}";

        Debug.Log($"Synchronized all build numbers to {nextBuildNumber}.\n{summary}");
        EditorUtility.DisplayDialog("Build Numbers Synchronized", summary, "OK");
    }

    private static void RunAllBuilds(bool incrementBuildNumberFirst)
    {
        string[] scenes = EditorBuildSettings.scenes.Where(scene => scene.enabled).Select(scene => scene.path).ToArray();
        if (scenes.Length == 0)
        {
            Debug.LogError("No enabled scenes were found in Build Settings. Aborting multi-platform build.");
            EditorUtility.DisplayDialog("Build Aborted", "No enabled scenes in Build Settings.", "OK");
            return;
        }

        if (incrementBuildNumberFirst)
        {
            SyncBuildNumbersToHighestPlusOne(includeBundleVersion: false);
        }

        string productName = string.IsNullOrWhiteSpace(PlayerSettings.productName) ? ProductNameFallback : PlayerSettings.productName;
        string windowsOutputRoot = WindowsBuildPath;
        string androidOutputRoot = AndroidBuildPath;
        string iosOutputRoot = IosBuildPath;
        BuildTarget originalTarget = EditorUserBuildSettings.activeBuildTarget;
        BuildTargetGroup originalTargetGroup = BuildPipeline.GetBuildTargetGroup(originalTarget);

        PrepareCleanBuildFolder(windowsOutputRoot);
        PrepareCleanBuildFolder(androidOutputRoot);
        EnsureBuildFolderExists(iosOutputRoot);

        BuildResult windowsResult = BuildResult.Unknown;
        BuildResult androidResult = BuildResult.Unknown;
        BuildResult iosResult = BuildResult.Unknown;

        try
        {
            windowsResult = BuildForTarget(
                scenes,
                BuildTargetGroup.Standalone,
                BuildTarget.StandaloneWindows64,
                Path.Combine(windowsOutputRoot, $"{productName}.exe"),
                "Windows");

            androidResult = BuildForTarget(
                scenes,
                BuildTargetGroup.Android,
                BuildTarget.Android,
                Path.Combine(androidOutputRoot, $"{productName}{GetAndroidExtension()}"),
                "Android");

            iosResult = BuildForTarget(
                scenes,
                BuildTargetGroup.iOS,
                BuildTarget.iOS,
                iosOutputRoot,
                "iOS");
        }
        finally
        {
            if (originalTargetGroup != BuildTargetGroup.Unknown)
            {
                SwitchActiveBuildTarget(originalTargetGroup, originalTarget);
            }
        }

        string summary =
            $"Windows output: {windowsOutputRoot}\n" +
            $"Android output: {androidOutputRoot}\n" +
            $"iOS output: {iosOutputRoot}\n" +
            $"Windows: {windowsResult}\n" +
            $"Android: {androidResult}\n" +
            $"iOS: {iosResult}";

        Debug.Log($"Multi-platform build complete.\n{summary}");
        EditorUtility.DisplayDialog("Multi-Platform Build Complete", summary, "OK");
    }

    private static void RunMobileBuilds(bool incrementBuildNumberFirst)
    {
        string[] scenes = EditorBuildSettings.scenes.Where(scene => scene.enabled).Select(scene => scene.path).ToArray();
        if (scenes.Length == 0)
        {
            Debug.LogError("No enabled scenes were found in Build Settings. Aborting mobile build.");
            EditorUtility.DisplayDialog("Build Aborted", "No enabled scenes in Build Settings.", "OK");
            return;
        }

        if (incrementBuildNumberFirst)
        {
            SyncBuildNumbersToHighestPlusOne(includeBundleVersion: false);
        }

        string productName = string.IsNullOrWhiteSpace(PlayerSettings.productName) ? ProductNameFallback : PlayerSettings.productName;
        string androidOutputRoot = AndroidBuildPath;
        string iosOutputRoot = IosBuildPath;
        BuildTarget originalTarget = EditorUserBuildSettings.activeBuildTarget;
        BuildTargetGroup originalTargetGroup = BuildPipeline.GetBuildTargetGroup(originalTarget);

        PrepareCleanBuildFolder(androidOutputRoot);
        EnsureBuildFolderExists(iosOutputRoot);

        BuildResult androidResult = BuildResult.Unknown;
        BuildResult iosResult = BuildResult.Unknown;

        try
        {
            androidResult = BuildForTarget(
                scenes,
                BuildTargetGroup.Android,
                BuildTarget.Android,
                Path.Combine(androidOutputRoot, $"{productName}{GetAndroidExtension()}"),
                "Android");

            iosResult = BuildForTarget(
                scenes,
                BuildTargetGroup.iOS,
                BuildTarget.iOS,
                iosOutputRoot,
                "iOS");
        }
        finally
        {
            if (originalTargetGroup != BuildTargetGroup.Unknown)
            {
                SwitchActiveBuildTarget(originalTargetGroup, originalTarget);
            }
        }

        string summary =
            $"Android output: {androidOutputRoot}\n" +
            $"iOS output: {iosOutputRoot}\n" +
            $"Android: {androidResult}\n" +
            $"iOS: {iosResult}";

        Debug.Log($"Mobile build complete.\n{summary}");
        EditorUtility.DisplayDialog("Mobile Build Complete", summary, "OK");
    }

    private static BuildResult BuildForTarget(
        string[] scenes,
        BuildTargetGroup targetGroup,
        BuildTarget target,
        string outputPath,
        string label)
    {
        if (!SwitchActiveBuildTarget(targetGroup, target))
        {
            return BuildResult.Failed;
        }

        string outputDirectory = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrWhiteSpace(outputDirectory))
        {
            Directory.CreateDirectory(outputDirectory);
        }

        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = scenes,
            targetGroup = targetGroup,
            target = target,
            locationPathName = outputPath,
            options = BuildOptions.None
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        BuildResult result = report.summary.result;

        if (result == BuildResult.Succeeded)
        {
            double totalMb = report.summary.totalSize / (1024f * 1024f);
            Debug.Log($"{label} build succeeded ({totalMb:F2} MB): {outputPath}");
        }
        else
        {
            Debug.LogError($"{label} build failed with result {result}: {outputPath}");
        }

        return result;
    }

    private static bool SwitchActiveBuildTarget(BuildTargetGroup targetGroup, BuildTarget target)
    {
        if (EditorUserBuildSettings.activeBuildTarget == target)
        {
            return true;
        }

        bool switched = EditorUserBuildSettings.SwitchActiveBuildTarget(targetGroup, target);
        if (!switched)
        {
            Debug.LogError($"Failed to switch active build target to {target}.");
        }

        return switched;
    }

    private static void PrepareCleanBuildFolder(string path)
    {
        if (Directory.Exists(path))
        {
            foreach (string directory in Directory.GetDirectories(path))
            {
                Directory.Delete(directory, recursive: true);
            }

            foreach (string file in Directory.GetFiles(path))
            {
                File.Delete(file);
            }
        }
        else
        {
            Directory.CreateDirectory(path);
        }
    }

    private static void EnsureBuildFolderExists(string path)
    {
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
    }

    private static string GetAndroidExtension()
    {
        return EditorUserBuildSettings.buildAppBundle ? ".aab" : ".apk";
    }

    private static int SyncBuildNumbersToHighestPlusOne(bool includeBundleVersion)
    {
        int androidCode = PlayerSettings.Android.bundleVersionCode;
        string iosBuildNumber = PlayerSettings.iOS.buildNumber;
        string bundleVersion = PlayerSettings.bundleVersion;

        if (!int.TryParse(iosBuildNumber, NumberStyles.Integer, CultureInfo.InvariantCulture, out int iosCode))
        {
            iosCode = androidCode;
        }

        int highestCode = Mathf.Max(androidCode, iosCode);
        if (TryReadBundleVersionNumber(bundleVersion, out int bundleVersionNumber))
        {
            highestCode = Mathf.Max(highestCode, bundleVersionNumber);
        }

        int nextCode = highestCode + 1;
        PlayerSettings.Android.bundleVersionCode = nextCode;
        PlayerSettings.iOS.buildNumber = nextCode.ToString(CultureInfo.InvariantCulture);

        if (includeBundleVersion)
        {
            PlayerSettings.bundleVersion = WithUpdatedBundleVersion(bundleVersion, nextCode);
        }

        Debug.Log(
            $"Synchronized build numbers. Android: {androidCode} -> {nextCode}, " +
            $"iOS: {iosBuildNumber} -> {PlayerSettings.iOS.buildNumber}, " +
            $"bundleVersion: {bundleVersion} -> {PlayerSettings.bundleVersion}.");

        return nextCode;
    }

    private static bool TryReadBundleVersionNumber(string bundleVersion, out int value)
    {
        if (int.TryParse(bundleVersion, NumberStyles.Integer, CultureInfo.InvariantCulture, out value))
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(bundleVersion))
        {
            value = 0;
            return false;
        }

        string[] parts = bundleVersion.Split('.');
        if (parts.Length == 0)
        {
            value = 0;
            return false;
        }

        string last = parts[parts.Length - 1];
        return int.TryParse(last, NumberStyles.Integer, CultureInfo.InvariantCulture, out value);
    }

    private static string WithUpdatedBundleVersion(string bundleVersion, int nextCode)
    {
        string nextCodeString = nextCode.ToString(CultureInfo.InvariantCulture);

        if (string.IsNullOrWhiteSpace(bundleVersion))
        {
            return nextCodeString;
        }

        if (int.TryParse(bundleVersion, NumberStyles.Integer, CultureInfo.InvariantCulture, out _))
        {
            return nextCodeString;
        }

        string[] parts = bundleVersion.Split('.');
        if (parts.Length <= 1)
        {
            return nextCodeString;
        }

        parts[parts.Length - 1] = nextCodeString;
        return string.Join(".", parts);
    }
}
