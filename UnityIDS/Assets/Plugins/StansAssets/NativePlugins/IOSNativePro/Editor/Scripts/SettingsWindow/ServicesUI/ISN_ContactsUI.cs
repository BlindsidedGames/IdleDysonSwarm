using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_ContactsUI : ISN_ServiceSettingsUI
    {
        readonly GUIContent ContactsUsageDescription = new GUIContent("Contacts Usage Description[?]:", " The key lets you describe the reason your app accesses the user’s contacts. When the system prompts the user to allow access, this string is displayed as part of the alert.");

        public override void OnAwake()
        {
            base.OnAwake();
            AddFeatureUrl("Getting Started", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Getting-Started-(Contacts)");
            AddFeatureUrl("Contacts Store", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Contacts-Store");
            AddFeatureUrl("Contacts Picker", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Contacts-Picker");
        }

        public override string Title => "Contacts";

        protected override string Description => "Access the user's contacts and format and localize contact information.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "Contacts_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_ContactsResolver>();

        protected override IEnumerable<string> SupportedPlatforms => new List<string>() { "iOS", "Unity Editor" };

        protected override void OnServiceUI()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("Contact Store")))
            {
                EditorGUILayout.HelpBox("Once you link with iOS 10 you must declare access to any user private data types.", MessageType.Info);

                EditorGUILayout.Space();
                EditorGUILayout.LabelField(ContactsUsageDescription);
                using (new IMGUIIndentLevel(1))
                {
                    ISN_Settings.Instance.ContactsUsageDescription = EditorGUILayout.TextArea(ISN_Settings.Instance.ContactsUsageDescription, SA_PluginSettingsWindowStyles.TextArea, GUILayout.Height(30));
                }
            }
        }
    }
}
