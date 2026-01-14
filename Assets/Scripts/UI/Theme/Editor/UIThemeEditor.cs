#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace IdleDysonSwarm.UI.Editor
{
    /// <summary>
    /// Editor utilities for UITheme assets.
    /// </summary>
    [InitializeOnLoad]
    public static class UIThemeEditor
    {
        static UIThemeEditor()
        {
            // Delay to ensure asset database is ready
            EditorApplication.delayCall += EnsureDefaultThemeExists;
        }

        private static void EnsureDefaultThemeExists()
        {
            string path = "Assets/Resources/DefaultUITheme.asset";
            var existing = AssetDatabase.LoadAssetAtPath<UITheme>(path);
            if (existing == null)
            {
                Debug.Log("[UIThemeEditor] Creating default UI theme...");
                CreateDefaultTheme();
            }
        }

        [MenuItem("Assets/Create/Idle Dyson Swarm/Create Default UI Theme", priority = 100)]
        public static void CreateDefaultTheme()
        {
            var theme = ScriptableObject.CreateInstance<UITheme>();

            // Set default colors matching the old Oracle constants
            theme.accentColor = new Color(1f, 0.643f, 0.369f); // #FFA45E (orange)
            theme.highlightColor = new Color(0f, 0.882f, 1f); // #00E1FF (cyan/blue)
            theme.positiveColor = new Color(0.569f, 0.867f, 0.561f); // #91DD8F (green)
            theme.warningColor = new Color(1f, 0.922f, 0.231f); // #FFEB3B (yellow)
            theme.negativeColor = new Color(1f, 0.341f, 0.341f); // #FF5757 (red)

            // Ensure Resources folder exists
            if (!AssetDatabase.IsValidFolder("Assets/Resources"))
            {
                AssetDatabase.CreateFolder("Assets", "Resources");
            }

            string path = "Assets/Resources/DefaultUITheme.asset";

            AssetDatabase.CreateAsset(theme, path);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            EditorUtility.FocusProjectWindow();
            Selection.activeObject = theme;

            Debug.Log($"Created default UI theme at: {path}");
        }
    }
}
#endif
