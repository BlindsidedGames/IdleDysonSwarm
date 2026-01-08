using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using System.Collections.Generic;
using SA.iOS.UIKit;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_AppDelegateUI : ISN_ServiceSettingsUI
    {
        readonly GUIContent m_note = new GUIContent("Note: Disabling App Delegate, will also disable User Notifications.");

        public override void OnAwake()
        {
            base.OnAwake();

            AddFeatureUrl("Getting Started", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Getting-Started-(App-Delegate)");
            AddFeatureUrl("System Events", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/System-Events");
            AddFeatureUrl("Force Touch Menu", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Force-Touch-Menu");
            AddFeatureUrl("External URL Calls", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/External-URL-Calls");
            AddFeatureUrl("Universal Links", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Universal-Links");
        }

        public override string Title => "App Delegate";

        protected override string Description => "A set of methods that are called in response to important events in the lifetime of your app.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "AppDelegate_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_AppDelegateResolver>();

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
            UrlTypesSettings();
            ForceTouchItemsBlock();
        }

        void UrlTypesSettings()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("URL Types")))
            {
                IMGUILayout.ReorderablList(ISN_Settings.Instance.UrlTypes,
                    url => url.Identifier,
                    url =>
                    {
                        EditorGUILayout.BeginHorizontal();
                        EditorGUILayout.LabelField("Identifier");
                        url.Identifier = EditorGUILayout.TextField(url.Identifier);
                        EditorGUILayout.EndHorizontal();

                        for (var i = 0; i < url.Schemes.Count; i++)
                        {
                            EditorGUILayout.BeginHorizontal();
                            EditorGUILayout.LabelField("Scheme " + i.ToString());
                            url.Schemes[i] = EditorGUILayout.TextField(url.Schemes[i]);

                            var plus = GUILayout.Button("+", EditorStyles.miniButtonLeft, GUILayout.Width(20));
                            if (plus) url.AddSchemes("url_sheme");

                            var rem = GUILayout.Button("-", EditorStyles.miniButtonLeft, GUILayout.Width(20));
                            if (rem)
                            {
                                url.Schemes.Remove(url.Schemes[i]);
                                return;
                            }

                            EditorGUILayout.EndHorizontal();
                        }
                    },
                    () =>
                    {
                        var newUlr = new ISN_UIUrlType(Application.identifier);
                        newUlr.AddSchemes("url_sheme");
                        ISN_Settings.Instance.UrlTypes.Add(newUlr);
                    });
            }
        }

        void ForceTouchItemsBlock()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("Force Touch Items")))
            {
                IMGUILayout.ReorderablList(ISN_Settings.Instance.ShortcutItems,
                    item => item.Title,
                    item =>
                    {
                        EditorGUILayout.BeginHorizontal();
                        EditorGUILayout.LabelField("Title");
                        item.Title = EditorGUILayout.TextField(item.Title);
                        EditorGUILayout.EndHorizontal();

                        EditorGUILayout.BeginHorizontal();
                        EditorGUILayout.LabelField("Subtitle");
                        item.Subtitle = EditorGUILayout.TextField(item.Subtitle);
                        EditorGUILayout.EndHorizontal();

                        EditorGUILayout.BeginHorizontal();
                        EditorGUILayout.LabelField("Type");
                        item.Type = EditorGUILayout.TextField(item.Type);
                        EditorGUILayout.EndHorizontal();
                    },
                    () =>
                    {
                        var newItem = new ISN_UIApplicationShortcutItem(string.Empty);
                        newItem.Title = "New Item";
                        ISN_Settings.Instance.ShortcutItems.Add(newItem);
                    });
            }
        }
    }
}
