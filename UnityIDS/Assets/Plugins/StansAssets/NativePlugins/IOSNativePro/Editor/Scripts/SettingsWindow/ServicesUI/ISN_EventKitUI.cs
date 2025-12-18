using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_EventKitUI : ISN_ServiceSettingsUI
    {
        readonly GUIContent NSCalendarsUsageDescription = new GUIContent("NSCalendars Usage Description[?]:", " The key lets you describe the reason your app accesses the user’s calendar app. When the system prompts the user to allow access, this string is displayed as part of the alert.");
        readonly GUIContent NSRemindersUsageDescription = new GUIContent("NSReminders Usage Description[?]:", " The key lets you describe the reason your app accesses the reminder app. When the system prompts the user to allow access, this string is displayed as part of the alert.");

        public override void OnAwake()
        {
            base.OnAwake();

            AddFeatureUrl("Getting Started", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Getting-Started-(EventKit)");
            AddFeatureUrl("Accessing the Event Store", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Accessing-the-Event-Store");
            AddFeatureUrl("Events", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Events");
            AddFeatureUrl("Reminders", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Reminders");
        }

        public override string Title => "Event Kit";

        protected override string Description => "Provides services for create, view, and edit calendar and reminder events.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "CoreLocation_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_EventKitResolver>();

        protected override void OnServiceUI()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("Usage Description")))
            {
                EditorGUILayout.HelpBox("Once you link with iOS 10 you must declare access to any user private data types.", MessageType.Info);

                EditorGUILayout.Space();
                EditorGUILayout.LabelField(NSCalendarsUsageDescription);
                using (new IMGUIIndentLevel(1))
                {
                    ISN_Settings.Instance.NsCalendarsUsageDescription = EditorGUILayout.TextArea(ISN_Settings.Instance.NsCalendarsUsageDescription, SA_PluginSettingsWindowStyles.TextArea, GUILayout.Height(30));
                }

                EditorGUILayout.Space();
                EditorGUILayout.LabelField(NSRemindersUsageDescription);
                using (new IMGUIIndentLevel(1))
                {
                    ISN_Settings.Instance.NsRemindersUsageDescription = EditorGUILayout.TextArea(ISN_Settings.Instance.NsRemindersUsageDescription, SA_PluginSettingsWindowStyles.TextArea, GUILayout.Height(30));
                }
            }
        }
    }
}
