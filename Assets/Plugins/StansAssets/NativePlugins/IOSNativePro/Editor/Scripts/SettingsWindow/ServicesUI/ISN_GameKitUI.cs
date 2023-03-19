using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using SA.iOS.GameKit;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_GameKitUI : ISN_ServiceSettingsUI
    {
        public override void OnAwake()
        {
            base.OnAwake();

            AddFeatureUrl("Getting Started", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Getting-Started");
            AddFeatureUrl("Authentication", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Authentication");
            AddFeatureUrl("Player Photo", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Authentication#player-photo");
            AddFeatureUrl("Server-side Auth", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Authentication#third-party-server-authentication");
            AddFeatureUrl("Game Center UI", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Game-Center-UI");
            AddFeatureUrl("Leaderboards", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Leaderboards");
            AddFeatureUrl("Default Leaderboard", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Leaderboards#one-leaderboard-is-the-default-leaderboard");
            AddFeatureUrl("Achievements", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Achievements");
            AddFeatureUrl("Saving A Game", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/Saving-A-Game");
            AddFeatureUrl("Access Point", "https://github.com/StansAssets/com.stansassets.ios-native/wiki/GK-Access-Point");
        }

        public override string Title => "Game Kit";

        protected override string Description => "GameKit offers features that you can use to create great social games.";

        protected override Texture2D Icon => EditorAssetDatabase.GetTextureAtPath(ISN_Skin.IconsPath + "GameKit_icon.png");

        protected override SA_iAPIResolver Resolver => ISN_Preprocessor.GetResolver<ISN_GameKitResolver>();

        protected override void OnServiceUI()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("Achievement")))
            {
                if (ISN_Settings.Instance.Achievements.Count == 0)
                    EditorGUILayout.HelpBox("Use this menu to list your game achievements. " +
                        "This step is not required, and only designed for your" +
                        "convinience, in case you are making custom in-game achievements view.", MessageType.Info);
                DrawAchievementsList();
            }

            using (new SA_WindowBlockWithSpace(new GUIContent("Saving A Game")))
            {
                EditorGUILayout.HelpBox("The saves API will allow you to provide your player an ability to save & load " +
                    "game progress at any time.", MessageType.Info);

                ISN_Settings.Instance.SavingAGame = IMGUILayout.ToggleFiled("API State", ISN_Settings.Instance.SavingAGame, IMGUIToggleStyle.ToggleType.EnabledDisabled);
            }
        }

        static readonly GUIContent s_AchievementIdDLabel = new GUIContent("Achievement Id[?]:", "A unique identifier that will be used for reporting. It can be composed of letters and numbers.");
        static readonly GUIContent s_AchievementNameLabel = new GUIContent("Achievement Name[?]:", "The name of the achievement. This is the editor only field.");

        public static void DrawAchievementsList()
        {
            IMGUILayout.ReorderablList(ISN_Settings.Instance.Achievements, GetAchievementDisplayName, DrawAchievementContent, () =>
            {
                ISN_Settings.Instance.Achievements.Add(new ISN_GKAchievement("my.new.achievement.id"));
            });
        }

        static string GetAchievementDisplayName(ISN_GKAchievement achievement)
        {
            return achievement.Name + "(" + achievement.Identifier + ")";
        }

        static void DrawAchievementContent(ISN_GKAchievement achievement)
        {
            achievement.Identifier = IMGUILayout.TextField(s_AchievementIdDLabel, achievement.Identifier);
            achievement.Name = IMGUILayout.TextField(s_AchievementNameLabel, achievement.Name);
        }
    }
}
