using System.IO;
using UnityEditor.Android;
using UnityEngine;

public sealed class AndroidSteamGradleStripper : IPostGenerateGradleAndroidProject
{
    private static readonly string[] SteamAndroidLibraryPaths =
    {
        "src/main/jniLibs/arm64-v8a/libsteam_api.so",
        "src/main/jniLibs/armeabi-v7a/libsteam_api.so"
    };

    public int callbackOrder => 1000;

    public void OnPostGenerateGradleAndroidProject(string path)
    {
        int removed = 0;

        foreach (string relativePath in SteamAndroidLibraryPaths)
        {
            string fullPath = Path.Combine(path, relativePath);
            if (!File.Exists(fullPath))
            {
                continue;
            }

            File.Delete(fullPath);
            removed++;
            Debug.Log($"Removed Steam Android native library from Gradle project: {fullPath}");
        }

        if (removed == 0)
        {
            Debug.Log("AndroidSteamGradleStripper found no Steam Android native libraries to remove.");
        }
    }
}
