using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

/*
Purpose:
- Provides Unity Editor menu actions under Tools/Build/Idle Dyson Swarm for synchronized multi-platform build orchestration.
- Runs in the Unity Editor only (not in player/runtime builds).

Primary entry points:
- BuildAllTargets() via MenuItem "Build iOS + Android + Windows + macOS + Linux".
- IncrementAndBuildAllTargets() via MenuItem "Increment Build Number + Build iOS + Android + Windows + macOS + Linux".
- IncrementAndBuildMobileTargets() via MenuItem "Increment Build Number + Build iOS + Android".
- SyncAllBuildNumbersToHighestPlusOne() via MenuItem "Sync All Build Numbers To Highest + 1".

Owns vs delegates:
- Owns build number synchronization, output folder prep policy, target switching, temporary standalone backend/architecture mutation, and build summary dialogs.
- Delegates actual platform build generation to Unity BuildPipeline.BuildPlayer and global project config to PlayerSettings.

Interacts with:
- Calls: UnityEditor.MenuItem, EditorBuildSettings, EditorUserBuildSettings, BuildPipeline, BuildPlayerOptions, BuildReport, PlayerSettings, EditorUtility, EditorApplication, UnityEditor.PackageManager.Client.
- Called by: Unity Editor menu system through the MenuItem attributes in this file.

Change notes:
- Changing MenuRoot/menu labels alters editor command discoverability and any team docs/process that reference those paths.
- Changing BuildForTarget options affects generated artifact behavior (notably iOS append vs regenerate for Xcode projects).
- Changing standalone backend/architecture logic affects Steam desktop output compatibility and can break Linux/macOS IL2CPP distribution if not restored correctly.
- Windows in all-platform flows is now explicitly forced to Standalone Mono before build; if this is changed, re-check macOS host compatibility and Steam pipeline expectations.
- Standalone backend/architecture calls are wrapped in local compat helpers with scoped CS0618 suppression; if Unity API surface changes, update those helpers first.
- Linux desktop builds now include explicit target switching plus package/toolchain readiness waits (with timeout) to avoid racing import/package initialization; if you change timeout rules, update Linux skip-reason messaging and companion docs.
- Changing output path constants affects external tooling/scripts expecting current build locations.
- No serialized fields, save keys, or ScriptableObject IDs are owned by this script.
*/
public static class MultiPlatformBuildMenu
{
    // These actions are build/publishing oriented and are more discoverable under the shared Tools/Build menu
    // than under game-specific editor tooling.
    private const string MenuRoot = "Tools/Build/Idle Dyson Swarm/";
    private const string BuildRootPath = "/Users/matthewrushworth/Builds";
    private const string GameBuildRootPath = BuildRootPath + "/Idle Dyson Swarm";
    private const string WindowsBuildPath = GameBuildRootPath + "/Windows";
    private const string AndroidBuildPath = GameBuildRootPath + "/Android";
    private const string IosBuildPath = GameBuildRootPath + "/iOS";
    private const string MacOsBuildPath = GameBuildRootPath + "/MacOS";
    private const string LinuxBuildPath = GameBuildRootPath + "/Linux";
    private const string ProductNameFallback = "IdleDysonSwarm";
    private const int MacOsUniversalArchitecture = 2;
    private const string LinuxSdkPackageName = "com.unity.sdk.linux-x86_64";
    private const string LinuxToolchainPackagePrefix = "com.unity.toolchain.";
    private const string LinuxToolchainPackageSuffix = "-linux";
    private const int LinuxReadinessPollIntervalMs = 1000;
    private const double LinuxReadinessTimeoutSeconds = 120d;

    [MenuItem(MenuRoot + "Build iOS + Android + Windows + macOS + Linux")]
    private static void BuildAllTargets()
    {
        RunAllBuilds(false);
    }

    [MenuItem(MenuRoot + "Increment Build Number + Build iOS + Android + Windows + macOS + Linux")]
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
        string macOsOutputRoot = MacOsBuildPath;
        string linuxOutputRoot = LinuxBuildPath;
        BuildTarget originalTarget = EditorUserBuildSettings.activeBuildTarget;
        BuildTargetGroup originalTargetGroup = BuildPipeline.GetBuildTargetGroup(originalTarget);
        ScriptingImplementation originalStandaloneScriptingBackend = GetStandaloneScriptingBackendCompat();
        int originalStandaloneArchitecture = GetStandaloneArchitectureCompat();

        PrepareCleanBuildFolder(windowsOutputRoot);
        PrepareCleanBuildFolder(androidOutputRoot);
        EnsureBuildFolderExists(iosOutputRoot);
        PrepareCleanBuildFolder(macOsOutputRoot);
        PrepareCleanBuildFolder(linuxOutputRoot);

        BuildResult windowsResult = BuildResult.Unknown;
        BuildResult androidResult = BuildResult.Unknown;
        BuildResult iosResult = BuildResult.Unknown;
        BuildResult macOsResult = BuildResult.Unknown;
        BuildResult linuxResult = BuildResult.Unknown;
        string windowsSkipReason = null;
        string macOsSkipReason = null;
        string linuxSkipReason = null;

        try
        {
            if (!EnsureStandaloneScriptingBackend(ScriptingImplementation.Mono2x, out string windowsBackendReason))
            {
                windowsSkipReason = windowsBackendReason;
                Debug.LogWarning($"Windows build skipped. {windowsSkipReason}");
            }
            else
            {
                windowsResult = BuildForTarget(
                    scenes,
                    BuildTargetGroup.Standalone,
                    BuildTarget.StandaloneWindows64,
                    Path.Combine(windowsOutputRoot, $"{productName}.exe"),
                    "Windows");
            }

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
                "iOS",
                BuildOptions.AcceptExternalModificationsToPlayer);

            if (!EnsureStandaloneScriptingBackend(ScriptingImplementation.IL2CPP, out string backendFailureReason))
            {
                macOsSkipReason = backendFailureReason;
                linuxSkipReason = backendFailureReason;
            }
            else
            {
                macOsResult = TryBuildDesktopTarget(
                    scenes,
                    BuildTarget.StandaloneOSX,
                    Path.Combine(macOsOutputRoot, $"{productName}.app"),
                    "macOS",
                    ensureMacUniversalArchitecture: true,
                    out macOsSkipReason);

                if (!SwitchActiveBuildTarget(BuildTargetGroup.Standalone, BuildTarget.StandaloneLinux64))
                {
                    linuxSkipReason = "Failed to switch active build target to StandaloneLinux64.";
                    Debug.LogWarning($"Linux build skipped. {linuxSkipReason}");
                }
                else if (!WaitForLinuxDesktopReadiness(out linuxSkipReason))
                {
                    Debug.LogWarning($"Linux build skipped. {linuxSkipReason}");
                }
                else
                {
                    linuxResult = TryBuildDesktopTarget(
                        scenes,
                        BuildTarget.StandaloneLinux64,
                        Path.Combine(linuxOutputRoot, $"{productName}.x86_64"),
                        "Linux",
                        ensureMacUniversalArchitecture: false,
                        out linuxSkipReason);
                }
            }
        }
        finally
        {
            RestoreStandaloneBuildSettings(originalStandaloneScriptingBackend, originalStandaloneArchitecture);

            if (originalTargetGroup != BuildTargetGroup.Unknown)
            {
                SwitchActiveBuildTarget(originalTargetGroup, originalTarget);
            }
        }

        string summary =
            $"Windows output: {windowsOutputRoot}\n" +
            $"Android output: {androidOutputRoot}\n" +
            $"iOS output: {iosOutputRoot}\n" +
            $"macOS output: {macOsOutputRoot}\n" +
            $"Linux output: {linuxOutputRoot}\n" +
            $"Windows: {FormatBuildStatus(windowsResult, windowsSkipReason)}\n" +
            $"Android: {androidResult}\n" +
            $"iOS: {iosResult}\n" +
            $"macOS: {FormatBuildStatus(macOsResult, macOsSkipReason)}\n" +
            $"Linux: {FormatBuildStatus(linuxResult, linuxSkipReason)}";

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
                "iOS",
                BuildOptions.AcceptExternalModificationsToPlayer);
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
        string label,
        BuildOptions buildOptions = BuildOptions.None)
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
            options = buildOptions
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

    private static BuildResult TryBuildDesktopTarget(
        string[] scenes,
        BuildTarget target,
        string outputPath,
        string label,
        bool ensureMacUniversalArchitecture,
        out string skipReason)
    {
        skipReason = null;
        if (!CanBuildTarget(BuildTargetGroup.Standalone, target, out skipReason))
        {
            Debug.LogWarning($"{label} build skipped. {skipReason}");
            return BuildResult.Unknown;
        }

        if (ensureMacUniversalArchitecture &&
            !EnsureStandaloneArchitecture(MacOsUniversalArchitecture, out skipReason))
        {
            Debug.LogWarning($"{label} build skipped. {skipReason}");
            return BuildResult.Unknown;
        }

        return BuildForTarget(
            scenes,
            BuildTargetGroup.Standalone,
            target,
            outputPath,
            label);
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

    private static bool CanBuildTarget(BuildTargetGroup targetGroup, BuildTarget target, out string reason)
    {
        if (BuildPipeline.IsBuildTargetSupported(targetGroup, target))
        {
            reason = null;
            return true;
        }

        reason = $"{target} build support is not installed. Install this module in Unity Hub and retry.";
        return false;
    }

    private static bool EnsureStandaloneScriptingBackend(ScriptingImplementation requiredBackend, out string reason)
    {
        SetStandaloneScriptingBackendCompat(requiredBackend);
        ScriptingImplementation appliedBackend = GetStandaloneScriptingBackendCompat();
        if (appliedBackend == requiredBackend)
        {
            reason = null;
            return true;
        }

        reason = $"Failed to switch Standalone scripting backend to {requiredBackend}. Current backend is {appliedBackend}.";
        return false;
    }

    private static bool EnsureStandaloneArchitecture(int requiredArchitecture, out string reason)
    {
        SetStandaloneArchitectureCompat(requiredArchitecture);
        int appliedArchitecture = GetStandaloneArchitectureCompat();
        if (appliedArchitecture == requiredArchitecture)
        {
            reason = null;
            return true;
        }

        reason = $"Failed to switch Standalone architecture to universal. Current architecture value is {appliedArchitecture}.";
        return false;
    }

    private static void RestoreStandaloneBuildSettings(
        ScriptingImplementation originalStandaloneScriptingBackend,
        int originalStandaloneArchitecture)
    {
        SetStandaloneScriptingBackendCompat(originalStandaloneScriptingBackend);
        SetStandaloneArchitectureCompat(originalStandaloneArchitecture);
    }

    private static string FormatBuildStatus(BuildResult result, string skipReason)
    {
        if (!string.IsNullOrWhiteSpace(skipReason))
        {
            return $"Skipped ({skipReason})";
        }

        return result.ToString();
    }

    private static bool WaitForLinuxDesktopReadiness(out string reason)
    {
        double startTime = EditorApplication.timeSinceStartup;
        double deadline = startTime + LinuxReadinessTimeoutSeconds;
        string lastReason = "Linux packages are still initializing.";

        try
        {
            while (EditorApplication.timeSinceStartup < deadline)
            {
                float progress = Mathf.Clamp01((float)((EditorApplication.timeSinceStartup - startTime) / LinuxReadinessTimeoutSeconds));
                EditorUtility.DisplayProgressBar(
                    "Preparing Linux Build",
                    "Waiting for Linux SDK/toolchain package initialization...",
                    progress);

                if (TryEvaluateLinuxDesktopReadiness(out bool ready, out string currentReason))
                {
                    if (ready)
                    {
                        reason = null;
                        return true;
                    }

                    lastReason = currentReason;
                }
                else
                {
                    lastReason = currentReason;
                }

                Thread.Sleep(LinuxReadinessPollIntervalMs);
            }
        }
        finally
        {
            EditorUtility.ClearProgressBar();
        }

        reason = $"Timed out after {LinuxReadinessTimeoutSeconds:0} seconds waiting for Linux packages/toolchain. Last check: {lastReason}";
        return false;
    }

    private static bool TryEvaluateLinuxDesktopReadiness(out bool ready, out string reason)
    {
        ready = false;
        if (!TryGetInstalledPackageNames(out HashSet<string> installedPackageNames, out reason))
        {
            return false;
        }

        bool hasLinuxSdkPackage = installedPackageNames.Contains(LinuxSdkPackageName);
        bool hasLinuxToolchainPackage = installedPackageNames.Any(IsLinuxToolchainPackage);
        bool supportsLinuxTarget = BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.Standalone, BuildTarget.StandaloneLinux64);

        if (hasLinuxSdkPackage && hasLinuxToolchainPackage && supportsLinuxTarget)
        {
            ready = true;
            reason = null;
            return true;
        }

        reason = BuildLinuxReadinessReason(hasLinuxSdkPackage, hasLinuxToolchainPackage, supportsLinuxTarget);
        return true;
    }

    private static bool TryGetInstalledPackageNames(out HashSet<string> installedPackageNames, out string reason)
    {
        installedPackageNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        UnityEditor.PackageManager.Requests.ListRequest listRequest =
            UnityEditor.PackageManager.Client.List(false, true);

        while (!listRequest.IsCompleted)
        {
            Thread.Sleep(100);
        }

        if (listRequest.Status != UnityEditor.PackageManager.StatusCode.Success)
        {
            reason = listRequest.Error != null
                ? $"Package Manager list failed: {listRequest.Error.message}"
                : "Package Manager list failed with an unknown error.";
            return false;
        }

        foreach (UnityEditor.PackageManager.PackageInfo package in listRequest.Result)
        {
            installedPackageNames.Add(package.name);
        }

        reason = null;
        return true;
    }

    private static bool IsLinuxToolchainPackage(string packageName)
    {
        return packageName.StartsWith(LinuxToolchainPackagePrefix, StringComparison.OrdinalIgnoreCase) &&
               packageName.EndsWith(LinuxToolchainPackageSuffix, StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildLinuxReadinessReason(bool hasLinuxSdkPackage, bool hasLinuxToolchainPackage, bool supportsLinuxTarget)
    {
        string sdkMessage = hasLinuxSdkPackage
            ? "Linux SDK package detected."
            : $"Missing package '{LinuxSdkPackageName}'.";

        string toolchainMessage = hasLinuxToolchainPackage
            ? "Linux host toolchain package detected."
            : "Missing Linux host toolchain package (expected one of com.unity.toolchain.macos-arm64-linux / com.unity.toolchain.macos-x64-linux / com.unity.toolchain.win-x86_64-linux).";

        string targetMessage = supportsLinuxTarget
            ? "StandaloneLinux64 target support detected."
            : "StandaloneLinux64 build target support is still unavailable.";

        return $"{sdkMessage} {toolchainMessage} {targetMessage}";
    }

    private static ScriptingImplementation GetStandaloneScriptingBackendCompat()
    {
#pragma warning disable 618
        return PlayerSettings.GetScriptingBackend(BuildTargetGroup.Standalone);
#pragma warning restore 618
    }

    private static void SetStandaloneScriptingBackendCompat(ScriptingImplementation backend)
    {
#pragma warning disable 618
        PlayerSettings.SetScriptingBackend(BuildTargetGroup.Standalone, backend);
#pragma warning restore 618
    }

    private static int GetStandaloneArchitectureCompat()
    {
#pragma warning disable 618
        return PlayerSettings.GetArchitecture(BuildTargetGroup.Standalone);
#pragma warning restore 618
    }

    private static void SetStandaloneArchitectureCompat(int architecture)
    {
#pragma warning disable 618
        PlayerSettings.SetArchitecture(BuildTargetGroup.Standalone, architecture);
#pragma warning restore 618
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
