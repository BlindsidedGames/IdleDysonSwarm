using SA.Foundation.Editor;
using StansAssets.Plugins.Editor;
using UnityEditor;
using UnityEngine;

namespace SA.iOS
{
    class ISN_AppTrackingTransparencyUI : ISN_ServiceSettingsUI
    {
        readonly GUIContent m_UserTrackingUsageDescription = new GUIContent("User Tracking Usage Description[?]:", " A message that informs the user why an app is requesting permission to use data for tracking the user or the device.");

        
        public override void OnAwake()
        {
            base.OnAwake();

            AddFeatureUrl("ATTrackingManager", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/ATTrackingManager");
        }

        public override string Title => "App Tracking Transparency";

        protected override string Description =>
            "If your app collects data about end users and shares it with other companies for tracking purposes." +
            "The framework presents an app-tracking authorization request " +
            "to the user and provides the tracking authorization status.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "CoreLocation_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<AppTrackingTransparencyResolver>();

        protected override void OnServiceUI()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("Usage Description")))
            {
                EditorGUILayout.HelpBox("Since iOS 14 If your app collects data about end users and shares it, you need to as user permission for that" +
                    "If your app will call the App Tracking Transparency APIs, " +
                    "you must provide custom text, known as a usage-description string," +
                    " which is displayed as a system-permission alert request. " +
                    "The usage-description string informs the user why the app is requesting permission " +
                    "to use data for tracking the user or the device. " +
                    "The app user has the option to grant or deny the authorization request. " +
                    "If you don’t include a usage-description string, your app may crash when a user first launches it.", MessageType.Info);

                EditorGUILayout.Space();
                EditorGUILayout.LabelField(m_UserTrackingUsageDescription);
                using (new IMGUIIndentLevel(1))
                {
                    ISN_Settings.Instance.UserTrackingUsageDescription = EditorGUILayout.TextArea(ISN_Settings.Instance.UserTrackingUsageDescription, SA_PluginSettingsWindowStyles.TextArea, GUILayout.Height(30));
                }
            }
        }
    }
}
