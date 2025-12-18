using UnityEngine;
using System.IO;
using StansAssets.IOS.XCode;

namespace SA.iOS.Editor
{
    static class ISN_SettingsManager
    {
        public static void Export(string filepath)
        {
            if (filepath.Length != 0)
            {
                var exportedSettings = new ISN_ExportedSettings();
                var dataJson = JsonUtility.ToJson(exportedSettings);
                if (dataJson != null)
                    File.WriteAllBytes(filepath, System.Text.Encoding.UTF8.GetBytes(dataJson));
            }
        }

        public static void Import(string filepath)
        {
            if (filepath.Length != 0)
            {
                var fileContent = File.ReadAllText(filepath);
                if (fileContent != null)
                {
                    var importedSettings = JsonUtility.FromJson<ISN_ExportedSettings>(fileContent);
                    JsonUtility.FromJsonOverwrite(importedSettings.ISNSettings, ISN_Settings.Instance);
                    JsonUtility.FromJsonOverwrite(importedSettings.ISDSettings, XCodeProjectSettings.Instance);
                }
            }
        }

        public static ISN_ExportedSettings GetExportedSettings()
        {
            return new ISN_ExportedSettings();
        }
    }
}
