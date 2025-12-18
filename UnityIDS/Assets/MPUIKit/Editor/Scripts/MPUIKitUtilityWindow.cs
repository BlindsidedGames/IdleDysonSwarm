using System.IO;
using UnityEditor;
using UnityEngine;

namespace MPUIKIT.Editor
{
    public class MPUIKitUtilityWindow : EditorWindow
    {
        private static SerializedObject _graphicsSettingsObj;
        private static bool _setup;
        private static bool _alreadyShownOnStartup;
        private bool _initialized;
        private string _version = "Version: 1.2.1";
        private static MPUIKitSettings _settings;
        private static bool _setupIsRequired;
        private static UnityEditor.Editor _settingsEditor;


        [MenuItem("Window/MPUIKit/Utility Panel")]
        public static void ShowWindow()
        {
            EditorWindow window = GetWindow<MPUIKitUtilityWindow>(true, "MPUIKit Utility Panel", true);
            window.minSize = new Vector2(400, 540);
            window.maxSize = new Vector2(400, 540);
            LoadSettings();
        }

        private void OnEnable()
        {
            LoadSettings();
        }

        private static void LoadSettings()
        {
            if (_settings) return;
            string path =
                $"{MPEditorUtility.FindMPUIKitRootDirectory()}Editor{Path.DirectorySeparatorChar}MPUIKitSettings.asset";
            _settings = AssetDatabase.LoadAssetAtPath<MPUIKitSettings>(path);
            if (_settings == null)
            {
                _settings = CreateInstance<MPUIKitSettings>();
                AssetDatabase.CreateAsset(_settings, path);
                AssetDatabase.SaveAssets();
                AssetDatabase.Refresh();
            }
        }


        private void OnGUI()
        {
            TopBannerGUI();
            WelcomeGUI();
            SettingsGUI();
            UtilButtonsGUI();
            BottomBarGUI();
        }

        private static void TopBannerGUI()
        {
            Rect headingRect = new Rect(0, 0, EditorGUIUtility.currentViewWidth, EditorGUIUtility.singleLineHeight * 5);
            Rect backgroundTexCoords = new Rect(0, 0, headingRect.width / headingRect.height, 1);
            Texture background = MPEditorContents.Background;
            background.wrapMode = TextureWrapMode.Repeat;
            GUI.DrawTextureWithTexCoords(headingRect, background, backgroundTexCoords);

            float height = headingRect.height;
            float width = headingRect.width - height - 30;
            Rect titleRect = new Rect(headingRect.width - width - 5, 20, width, height - 30);
            GUI.DrawTexture(titleRect, MPEditorContents.Title, ScaleMode.ScaleToFit);


            Rect textureRect = headingRect;
            textureRect.x = 0;
            textureRect.width = textureRect.height - 7;
            textureRect.height -= 7;
            GUI.DrawTexture(textureRect, MPEditorContents.Logo, ScaleMode.ScaleToFit);
            GUILayout.Space(headingRect.height + 20);
        }

        private void SettingsGUI()
        {
            if (!_settingsEditor)
            {
                UnityEditor.Editor.CreateCachedEditor(_settings, typeof(MPUIKitSettingsEditor), ref _settingsEditor);
            }

            _settingsEditor.OnInspectorGUI();
        }

        private static void WelcomeGUI()
        {
            var style = new GUIStyle(GUI.skin.label) {alignment = TextAnchor.MiddleCenter};
            EditorGUILayout.LabelField("Thank you for using", style, GUILayout.ExpandWidth(true));
            EditorGUILayout.LabelField("Modern Procedural UI Kit", style, GUILayout.ExpandWidth(true));
            GUILayout.Space(20);
        }

        private static void UtilButtonsGUI()
        {
            GUILayout.Space(6);
            Rect buttonRect = EditorGUILayout.GetControlRect(false, 40 * 3 + 4);
            buttonRect.width = (buttonRect.width / 2) - 1;
            buttonRect.height = 40;

            if (GUI.Button(buttonRect, "Documentation"))
            {
                Application.OpenURL("https://scrollbie.com/documentations/mpuikit-docs/");
            }

            buttonRect.x += buttonRect.width + 2;
            if (GUI.Button(buttonRect, "Website"))
            {
                Application.OpenURL("https://scrollbie.com/mpuikit/");
            }

            buttonRect.y += 42;
            buttonRect.x -= buttonRect.width + 2;
            if (GUI.Button(buttonRect, "Email"))
            {
                Application.OpenURL("mailto:support@scrollbie.com");
            }

            buttonRect.x += buttonRect.width + 2;
            if (GUI.Button(buttonRect, "Forum"))
            {
                Application.OpenURL(
                    "https://forum.unity.com/threads/an-advanced-procedural-ui-generation-tool-create-modify-animate-spriteless-ui-even-at-runtime.846772");
            }

            buttonRect.y += 42;
            buttonRect.x -= buttonRect.width + 2;
            if (GUI.Button(buttonRect, "Changelog"))
            {
                Application.OpenURL("https://scrollbie.com/mpuikit/changelog.html");
            }

            buttonRect.x += buttonRect.width + 2;
            if (GUI.Button(buttonRect, "Other Assets"))
            {
                Application.OpenURL("https://assetstore.unity.com/publishers/29536");
            }

            if (GUILayout.Button("★ Rate/Review MPUIKit", GUILayout.ExpandWidth(true), GUILayout.Height(40)))
            {
                Application.OpenURL("https://assetstore.unity.com/packages/slug/163041");
            }
        }

        private void BottomBarGUI()
        {
            EditorGUILayout.BeginVertical();
            {
                GUILayout.FlexibleSpace();
                EditorGUILayout.BeginHorizontal();
                {
                    EditorGUILayout.LabelField("© Copyright 2020 Scrollbie Studio", EditorStyles.miniLabel);
                    GUIStyle style = new GUIStyle(EditorStyles.miniLabel);
                    style.alignment = TextAnchor.MiddleRight;
                    GUILayout.FlexibleSpace();
                    EditorGUILayout.LabelField(_version, style, GUILayout.Width(120));
                }
                EditorGUILayout.EndHorizontal();
            }
            EditorGUILayout.EndVertical();
        }
    }
}