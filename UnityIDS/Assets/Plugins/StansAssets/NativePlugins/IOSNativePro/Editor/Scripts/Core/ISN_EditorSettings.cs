using UnityEngine;
using System.Collections.Generic;
using SA.Foundation.Patterns;
using StansAssets.IOS.XCode;

namespace SA.iOS
{
    class ISN_EditorSettings : SA_ScriptableSingletonEditor<ISN_EditorSettings>
    {
        public List<AudioClip> NotificationAlertSounds = new List<AudioClip>();

        //--------------------------------------
        // SA_ScriptableSettings
        //--------------------------------------

        protected override string BasePath => ISN_Settings.IOSNativeFolder;

        public override string PluginName => ISN_Settings.Instance.PluginName + " Editor";

        public override string DocumentationURL => ISN_Settings.Instance.DocumentationURL;

        public override string SettingsUIMenuItem => ISN_Settings.Instance.SettingsUIMenuItem;


        public static string CameraUsageDescription
        {
            get => GetPlistKeyValue("NSCameraUsageDescription", "Please change 'Camera Usage Description' with IOS Native UI Kit Editor Settings", ISN_Settings.Instance.CameraUsageDescriptionEnabled);

            set => SetPlistKeyValue("NSCameraUsageDescription", value, ISN_Settings.Instance.CameraUsageDescriptionEnabled);
        }

        public static string MediaLibraryUsageDescription
        {
            get => GetPlistKeyValue("NSAppleMusicUsageDescription", "Please change 'Media Library Usage Description' with IOS Native Media Player Editor Settings", ISN_Settings.Instance.PhotoLibraryUsageDescriptionEnabled);

            set => SetPlistKeyValue("NSAppleMusicUsageDescription", value, ISN_Settings.Instance.PhotoLibraryUsageDescriptionEnabled);
        }
        public static string PhotoLibraryUsageDescription
        {
            get => GetPlistKeyValue("NSPhotoLibraryUsageDescription", "Please change 'Photo Library Usage Description' with IOS Native UI Kit Editor Settings", ISN_Settings.Instance.PhotoLibraryUsageDescriptionEnabled);

            set => SetPlistKeyValue("NSPhotoLibraryUsageDescription", value, ISN_Settings.Instance.PhotoLibraryUsageDescriptionEnabled);
        }

        public static string PhotoLibraryAddUsageDescription
        {
            get => GetPlistKeyValue("NSPhotoLibraryAddUsageDescription", "Please change 'Photo Library Add Usage Description' with IOS Native UI Kit Editor Settings", ISN_Settings.Instance.PhotoLibraryAddUsageDescriptionEnabled);

            set => SetPlistKeyValue("NSPhotoLibraryAddUsageDescription", value, ISN_Settings.Instance.PhotoLibraryAddUsageDescriptionEnabled);
        }

        public static string MicrophoneUsageDescription
        {
            get => GetPlistKeyValue("NSMicrophoneUsageDescription", "Please change 'Microphone Usage Description' with IOS Native UI Kit Editor Settings", ISN_Settings.Instance.MicrophoneUsageDescriptionEnabled);

            set => SetPlistKeyValue("NSMicrophoneUsageDescription", value, ISN_Settings.Instance.MicrophoneUsageDescriptionEnabled);
        }


        static void SetPlistKeyValue(string key, string val, bool enabled)
        {
            if (!enabled)
                return;

            if (!val.Equals(GetPlistKeyValue(key, val, true)))

                // We are sure it's not null.
                XCodeProject.GetInfoPlistKey(key).StringValue = val;
        }

        static string GetPlistKeyValue(string key, string defaultValue, bool enabled)
        {
            if (!enabled) return defaultValue;
            var plistKey = XCodeProject.GetInfoPlistKey(key);
            if (plistKey == null)
            {
                plistKey = new InfoPlistKey();
                plistKey.Name = key;
                plistKey.StringValue = defaultValue;
                plistKey.Type = InfoPlistKeyType.String;
                XCodeProject.SetInfoPlistKey(plistKey);
            }

            return plistKey.StringValue;
        }
    }
}
