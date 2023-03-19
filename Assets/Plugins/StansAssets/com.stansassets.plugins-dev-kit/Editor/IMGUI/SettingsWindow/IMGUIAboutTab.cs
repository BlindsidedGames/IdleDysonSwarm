using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public class IMGUIAboutTab : IMGUILayoutElement
    {
           //What we do
        [SerializeField]
        IMGUIHyperLabel m_Games;
        [SerializeField]
        IMGUIHyperLabel m_Plugins;
        [SerializeField]
        IMGUIHyperLabel m_Team;

        //How to get in touch
        [SerializeField]
        IMGUIHyperLabel m_LinkedIn;
        [SerializeField]
        IMGUIHyperLabel m_Twitter;
        [SerializeField]
        IMGUIHyperLabel m_Facebook;

        [SerializeField]
        IMGUIHyperLabel m_Youtube;
        [SerializeField]
        IMGUIHyperLabel m_Google;
        [SerializeField]
        IMGUIHyperLabel m_Twitch;

        [SerializeField]
        IMGUIHyperLabel m_SupportMail;
        [SerializeField]
        IMGUIHyperLabel m_CeoMail;

        [SerializeField]
        IMGUIHyperLabel m_WebSiteLabel;

        const int k_LabelWidth = 100;
        const int k_SocialLabelWidth = 70;

        readonly GUIContent m_WhoWeAre = new GUIContent("Stan’s Assets is a team of Unity developers " +
            "with more than 6 years of experience that are " +
            "committed to develop high quality and " +
            "engaging entertainment software.");

        readonly GUIContent m_WhatWeDo = new GUIContent("Game development our main direction. But we do everything that is " +
            "connected to Unity. Games, Plugins, VR, AR " +
            "and even enterprise applications with 3D elements. " +
            "And of course we are always looking forward to a new challenging projects.");

        public override void OnLayoutEnable()
        {
            m_Games = CreateAboutLabel(" Our Games", "game.png");
            m_Plugins = CreateAboutLabel(" Our Plugins", "plugin.png");
            m_Team = CreateAboutLabel(" Our Team", "team.png");

            m_LinkedIn = CreateSocialLabel("LinkedIn", "linkedin.png");
            m_Twitter = CreateSocialLabel("Twitter", "twitter.png");
            m_Facebook = CreateSocialLabel("Facebook", "facebook.png");

            m_Youtube = CreateSocialLabel("Youtube", "youtube.png");
            m_Google = CreateSocialLabel("Google+", "google-plus.png");
            m_Twitch = CreateSocialLabel("Twitch", "twitch.png");

            m_SupportMail = CreateTextLabel(PluginsDevKitPackage.StansAssetsSupportEmail);
            m_CeoMail = CreateTextLabel(PluginsDevKitPackage.StansAssetsCeoEMail);

            m_WebSiteLabel = new IMGUIHyperLabel(new GUIContent(IMGUICompanyGUILayout.Logo), SettingsWindowStyles.DescriptionLabelStyle);
            m_WebSiteLabel.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
        }

        public override void OnGUI()
        {
            using (new IMGUIWindowBlockWithIndent(new GUIContent("Who we are")))
            {
                EditorGUILayout.LabelField(m_WhoWeAre, SettingsWindowStyles.DescriptionLabelStyle);
                EditorGUILayout.Space();
            }

            using (new IMGUIWindowBlockWithIndent(new GUIContent("What we do")))
            {
                EditorGUILayout.LabelField(m_WhatWeDo, SettingsWindowStyles.DescriptionLabelStyle);
                EditorGUILayout.Space();

                EditorGUILayout.Space();
                using (new IMGUIBeginHorizontal())
                {
                    var games = m_Games.Draw(GUILayout.Width(k_LabelWidth));
                    if (games) Application.OpenURL("https://stansassets.com/#portfolio");

                    var plugins = m_Plugins.Draw(GUILayout.Width(k_LabelWidth));
                    if (plugins) Application.OpenURL("https://assetstore.unity.com/publishers/2256");

                    EditorGUILayout.Space();
                }

                EditorGUILayout.Space();
                using (new IMGUIBeginHorizontal())
                {
                    var team = m_Team.Draw(GUILayout.Width(k_LabelWidth));
                    if (team) Application.OpenURL(" https://stansassets.com/#our-team");

                    EditorGUILayout.Space();
                }
            }

            using (new IMGUIWindowBlockWithIndent(new GUIContent("How to get in touch")))
            {
                using (new IMGUIBeginHorizontal())
                {
                    EditorGUILayout.LabelField("If you have any technical issues or questions, do not hesitate to drop us a message at:", SettingsWindowStyles.DescriptionLabelStyle);
                }

                using (new IMGUIBeginHorizontal())
                {
                    if (m_SupportMail.Draw()) Application.OpenURL("mailto:" + PluginsDevKitPackage.StansAssetsSupportEmail);
                }

                EditorGUILayout.Space();
                using (new IMGUIBeginHorizontal())
                {
                    EditorGUILayout.LabelField("For a non technical and business related questions, use:", SettingsWindowStyles.DescriptionLabelStyle);
                }

                bool clicked;
                using (new IMGUIBeginHorizontal())
                {
                    clicked = m_CeoMail.Draw();
                    if (clicked) Application.OpenURL("mailto:" + PluginsDevKitPackage.StansAssetsCeoEMail);
                }

                EditorGUILayout.Space();
                using (new IMGUIBeginHorizontal())
                {
                    EditorGUILayout.LabelField("Let's just be in touch", SettingsWindowStyles.DescriptionLabelStyle);
                }

                EditorGUILayout.Space();
                using (new IMGUIBeginHorizontal())
                {
                    clicked = m_LinkedIn.Draw(GUILayout.Width(k_SocialLabelWidth));
                    if (clicked) Application.OpenURL("https://www.linkedin.com/in/lacost");
                    clicked = m_Twitter.Draw(GUILayout.Width(k_SocialLabelWidth));
                    if (clicked) Application.OpenURL("https://twitter.com/stansassets");
                    clicked = m_Facebook.Draw(GUILayout.Width(k_SocialLabelWidth));
                    if (clicked) Application.OpenURL("https://www.facebook.com/stansassets/");

                    EditorGUILayout.Space();
                }

                EditorGUILayout.Space();
                using (new IMGUIBeginHorizontal())
                {
                    clicked = m_Youtube.Draw(GUILayout.Width(k_SocialLabelWidth));
                    if (clicked) Application.OpenURL("https://www.youtube.com/user/stansassets/videos");

                    clicked = m_Google.Draw(GUILayout.Width(k_SocialLabelWidth));
                    if (clicked) Application.OpenURL("https://plus.google.com/+StansassetsOfficial");

                    clicked = m_Twitch.Draw(GUILayout.Width(k_SocialLabelWidth));
                    if (clicked) Application.OpenURL("https://www.twitch.tv/stans_assets");

                    EditorGUILayout.Space();
                }

                EditorGUILayout.Space();

                using (new IMGUIBeginHorizontal())
                {
                    clicked = m_WebSiteLabel.Draw();
                    if (clicked) Application.OpenURL(PluginsDevKitPackage.StansAssetsWebsiteRootUrl);
                }
            }
        }

        IMGUIHyperLabel CreateAboutLabel(string title, string icon)
        {
            return CreateLabel(title, icon, PluginsEditorSkin.AboutIconsPath + "/");
        }

        IMGUIHyperLabel CreateSocialLabel(string title, string icon)
        {
            return CreateLabel(title, icon, PluginsEditorSkin.SocialIconsPath + "/");
        }

        IMGUIHyperLabel CreateLabel(string title, string icon, string iconFolder)
        {
            var image = EditorAssetDatabase.GetTextureAtPath(iconFolder + icon);
            var label = new IMGUIHyperLabel(new GUIContent(title, image), SettingsWindowStyles.DescriptionLabelStyle);
            label.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
            return label;
        }

        IMGUIHyperLabel CreateTextLabel(string title)
        {
            var label = new IMGUIHyperLabel(new GUIContent(title), SettingsWindowStyles.SelectableLabelStyle);
            label.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
            return label;
        }
    }
}
