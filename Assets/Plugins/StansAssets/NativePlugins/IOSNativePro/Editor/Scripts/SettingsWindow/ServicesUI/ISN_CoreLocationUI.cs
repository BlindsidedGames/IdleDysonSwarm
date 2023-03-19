using UnityEngine;
using UnityEditor;
using System.Collections.Generic;
using SA.Foundation.Editor;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_CoreLocationUI : ISN_ServiceSettingsUI
    {
        readonly GUIContent LocationWhenInUseUsageDescription = new GUIContent("In Use Usage Description[?]:", " The key lets you describe the reason your app accesses the user’s location. When the system prompts the user to allow access, this string is displayed as part of the alert.");
        readonly GUIContent LocationAlwaysAndWhenInUseUsageDescription = new GUIContent("Always Use Usage Description[?]:", " The key lets you describe the reason your app accesses the user’s location. When the system prompts the user to allow access, this string is displayed as part of the alert.");

        public override void OnAwake()
        {
            base.OnAwake();

            AddFeatureUrl("Getting Started", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Getting-Started-(Core-Location)");
            AddFeatureUrl("Requesting Permission", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Getting-Started-(Core-Location)#requesting-permission-to-use-location-services");

            AddFeatureUrl("Location Availability", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Availability");

            AddFeatureUrl("Location Updates", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Location-Updates");
            AddFeatureUrl("Request Location", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Location-Updates#request-location");
            AddFeatureUrl("Pause Updates", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Location-Updates#pause-location-updates");

            AddFeatureUrl("Location Delegate", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Location-Delegate");
        }

        public override string Title => "Core Location";

        protected override string Description => "Provides services for determining a device’s geographic location.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "CoreLocation_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_CoreLocationResolver>();

        protected override void OnServiceUI()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("Usage Description")))
            {
                EditorGUILayout.HelpBox("Once you link with iOS 10 you must declare access to any user private data types.", MessageType.Info);

                EditorGUILayout.Space();
                EditorGUILayout.LabelField(LocationWhenInUseUsageDescription);
                using (new IMGUIIndentLevel(1))
                {
                    ISN_Settings.Instance.LocationWhenInUseUsageDescription = EditorGUILayout.TextArea(ISN_Settings.Instance.LocationWhenInUseUsageDescription, SA_PluginSettingsWindowStyles.TextArea, GUILayout.Height(30));
                }

                EditorGUILayout.Space();
                EditorGUILayout.LabelField(LocationAlwaysAndWhenInUseUsageDescription);
                using (new IMGUIIndentLevel(1))
                {
                    ISN_Settings.Instance.LocationAlwaysAndWhenInUseUsageDescription = EditorGUILayout.TextArea(ISN_Settings.Instance.LocationAlwaysAndWhenInUseUsageDescription, SA_PluginSettingsWindowStyles.TextArea, GUILayout.Height(30));
                }
            }
        }
    }
}
