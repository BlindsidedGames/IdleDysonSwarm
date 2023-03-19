using UnityEngine;
using UnityEditor;
using System.Collections.Generic;
using StansAssets.IOS.XCode;
using SA.Foundation.Editor;
using Rotorz.ReorderableList;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_UserNotificationsUI : ISN_ServiceSettingsUI
    {
        readonly GUIContent m_note = new GUIContent("Note: Enabling User Notification, will also enable App Delegate.");
        readonly GUIContent m_APN_Description = new GUIContent("Remote notifications are appropriate " +
            "when some or all of the app’s data is" +
            " managed by your company’s servers.");

        public override void OnAwake()
        {
            base.OnAwake();

            AddFeatureUrl("Getting Started", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Getting-Started-(User-Notifications)");
            AddFeatureUrl("Scheduling", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Scheduling-Notifications");
            AddFeatureUrl("Notification Badge", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Scheduling-Notifications#add-a-badge-to-notification");
            AddFeatureUrl("Handling Notifications", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Responding-to-Notification");
            AddFeatureUrl("Cancelling Notifications", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Scheduling-Notifications#canceling-notifications");
            AddFeatureUrl("Remote Notifications", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Remote-Notifications");
        }

        public override string Title => "User Notifications";

        protected override string Description => "Supports the delivery and handling of local and remote notifications.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "UserNotifications_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_UserNotificationsResolver>();

        protected override IEnumerable<string> SupportedPlatforms => new List<string>() { "iOS" };

        protected override void GettingStartedBlock()
        {
            base.GettingStartedBlock();
            using (new IMGUIBeginHorizontal())
            {
                GUILayout.Space(15);
                GUILayout.Label(m_note, SA_PluginSettingsWindowStyles.AssetLabel);
            }
        }

        protected override void OnServiceUI()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("Local Notifications")))
            {
                ReorderableListGUI.Title("Custom Sounds");
                ReorderableListGUI.ListField(ISN_EditorSettings.Instance.NotificationAlertSounds, DrawObjectField, DrawEmptySounds);

                UpdateDeploySettings();
            }

            using (new SA_WindowBlockWithSpace(new GUIContent("Apple Push Notification Service")))
            {
                using (new IMGUIBeginHorizontal())
                {
                    GUILayout.Space(15);
                    EditorGUILayout.LabelField(m_APN_Description,  SettingsWindowStyles.DescriptionLabelStyle);
                }

                EditorGUILayout.Space();
                using (new IMGUIIndentLevel(1))
                {
                    XCodeProject.Capability.PushNotifications.Enabled = IMGUILayout.ToggleFiled("API Status", XCodeProject.Capability.PushNotifications.Enabled, IMGUIToggleStyle.ToggleType.EnabledDisabled);
                    XCodeProject.Capability.PushNotifications.Development = IMGUILayout.ToggleFiled("Development Environment", XCodeProject.Capability.PushNotifications.Development, IMGUIToggleStyle.ToggleType.EnabledDisabled);
                }
            }
        }

        void UpdateDeploySettings()
        {
            foreach (var asset in ISN_EditorSettings.Instance.NotificationAlertSounds)
            {
                if (asset == null) continue;

                var exists = XCodeProject.HasFile(asset);
                if (!exists)
                {
                    var xCodeFileLink = new XCodeAsset();
                    xCodeFileLink.Asset = asset;
                    XCodeProject.AddFile(xCodeFileLink);
                }
            }
        }

        T DrawObjectField<T>(Rect position, T itemValue) where T : Object
        {
            var drawRect = new Rect(position);
            drawRect.y += 2;
            drawRect.height = 15;
            return (T)EditorGUI.ObjectField(drawRect, itemValue, typeof(T), false);
        }

        void DrawEmptySounds()
        {
            EditorGUILayout.LabelField("Add sound clips you want to use as custom notification alert sound. The phone default alert sound will be used by default", PluginsEditorSkin.MiniLabelWordWrap);
        }
    }
}
