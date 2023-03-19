using UnityEngine;
using UnityEditor;
using StansAssets.IOS.XCode;
using SA.Foundation.Editor;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_FoundationUI : ISN_ServiceSettingsUI
    {
        public override void OnAwake()
        {
            base.OnAwake();

            AddFeatureUrl("iCloud Key-Value", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/iCloud-Key-Value-Storage");
            AddFeatureUrl("Build Info", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/BuildInfo");
            AddFeatureUrl("App Environment", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/BuildInfo#app-environment");
            AddFeatureUrl("Time Zone", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Time-Zone");
            AddFeatureUrl("Check If App Installed", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Using-URL-Schemes#how-to-check-programmatically-if-app-is-installed");

            AddFeatureUrl("Notification Center", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Notification-Center");
            AddFeatureUrl("Locale", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Locale");
            AddFeatureUrl("System Language", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Locale#system-language");
            AddFeatureUrl("Preferred Language", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Locale#preferred-language");

            //Av foundation
            AddFeatureUrl("Audio Session", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Audio-Session");
            AddFeatureUrl("Camera Permission", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Camera-Permission");
        }

        public override string Title => "Foundation";

        protected override string Description => "Access essential data types, collections, and operating-system services to define the base layer of functionality for your app.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "Foundation_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_FoundationResolver>();

        protected override bool CanBeDisabled => false;

        protected override void OnServiceUI()
        {
            DrawICloudSettings();
        }

        void DrawICloudSettings()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("iCloud Key-Value Storage")))
            {
                var description = new GUIContent("Key-value storage is similar to Unity PlayerPrefs; " +
                    "but values that you place in key-value storage are available to every " +
                    "instance of your app on all of a user’s various devices.");

                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.Space(15);
                    EditorGUILayout.LabelField(description,  SettingsWindowStyles.DescriptionLabelStyle);
                }

                EditorGUILayout.Space();

                var KeyValueStorageEnabled = XCodeProject.Capability.iCloud.Enabled && XCodeProject.Capability.iCloud.KeyValueStorage;
                EditorGUI.BeginChangeCheck();
                KeyValueStorageEnabled = IMGUILayout.ToggleFiled("API Status", KeyValueStorageEnabled, IMGUIToggleStyle.ToggleType.EnabledDisabled);

                if (EditorGUI.EndChangeCheck())
                {
                    if (KeyValueStorageEnabled)
                    {
                        XCodeProject.Capability.iCloud.Enabled = true;
                        XCodeProject.Capability.iCloud.KeyValueStorage = true;
                    }
                    else
                    {
                        XCodeProject.Capability.iCloud.Enabled = false;
                        XCodeProject.Capability.iCloud.KeyValueStorage = false;
                    }
                }
            }
        }
    }
}
