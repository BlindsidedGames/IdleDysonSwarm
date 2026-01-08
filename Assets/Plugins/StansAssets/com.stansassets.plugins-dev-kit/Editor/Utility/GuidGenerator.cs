using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public static class GuidGenerator
    {
        const int k_CountCharGiudField = 6;

        public static void RegenerateGuid(string assetPath)
        {
            try
            {
                var path = $"{assetPath}.meta";
                var metafile = File.ReadAllText(path);
                var startGuid = metafile.IndexOf("guid:");
                if (startGuid > 0)
                {
                    startGuid += k_CountCharGiudField;
                    var endGuid = metafile.Substring(startGuid).IndexOf("\n");
                    var oldGuid = metafile.Substring(startGuid, endGuid);
                    metafile = metafile.Replace(oldGuid, Guid.NewGuid().ToString("N"));
                    File.WriteAllText(path, metafile);
                }
                else
                {
                    Debug.LogError("Does not contain guid in the metafile");
                }
            }
            catch (Exception exception)
            {
                Debug.LogError(exception.Message);
            }
        }

        public static void RegenerateGuid(IEnumerable<string> assetPaths)
        {
            foreach (var assetPath in assetPaths)
            {
                RegenerateGuid(assetPath);
            }
        }

        public static void RegenerateGuidsInFolder(string folderPath, bool recursive = false)
        {
            if (Directory.Exists(folderPath))
                ProcessDirectory(folderPath, recursive);
            
            RegenerateGuid(folderPath);
        }

        public static void RegenerateGuidsInFolder(IEnumerable<string> folderPaths, bool recursive = false)
        {
            foreach (var assetPath in folderPaths)
            {
                RegenerateGuidsInFolder(assetPath, recursive);
            }
        }

        static void ProcessDirectory(string targetDirectory, bool recursive = true)
        {
            string[] fileEntries = Directory.GetFiles(targetDirectory);
            foreach (string fileName in fileEntries)
                if (!fileName.Contains(".meta"))
                    RegenerateGuid(fileName);

            string[] subdirectoryEntries = Directory.GetDirectories(targetDirectory);
            foreach (string subdirectory in subdirectoryEntries)
            {
                RegenerateGuid(subdirectory);
                if (recursive)
                    ProcessDirectory(subdirectory);
            }
        }
    }
}
