using System.Collections.Generic;
using StansAssets.Plugins.Editor;
using UnityEngine;
using UnityEditor;
using UnityEditor.AnimatedValues;

namespace SA.Foundation.Editor
{
    public abstract class SA_ServiceLayout : IMGUILayoutElement
    {
        [SerializeField]
        bool m_IsSelected;
        [SerializeField]
        IMGUIHyperLabel m_BlockTitleLabel;
        [SerializeField]
        IMGUIHyperLabel m_BlockAPIStateLabel;
        [SerializeField]
        IMGUIHyperLabel m_APIEnableButton;

        [SerializeField]
        IMGUIHyperLabel m_ShowMoreButton;
        [SerializeField]
        protected List<IMGUIDocumentationUrl> m_Features;

        AnimBool m_ShowExtraFields;
        bool m_SearchUIActive = false;

        [SerializeField]
        Texture2D m_ExpandOpenIcon;
        [SerializeField]
        Texture2D m_ExpandClosedIcon;

        [SerializeField]
        Texture2D m_ONToggle;
        [SerializeField]
        Texture2D m_OffToggle;

        //--------------------------------------
        // Abstract
        //--------------------------------------

        public abstract string Title { get; }
        protected abstract string Description { get; }
        protected abstract Texture2D Icon { get; }
        protected abstract SA_iAPIResolver Resolver { get; }
        protected abstract void OnServiceUI();
        protected abstract void DrawServiceRequirements();

        //--------------------------------------
        // Virtual
        //--------------------------------------

        protected virtual bool CanBeDisabled => true;

        protected virtual IEnumerable<string> SupportedPlatforms => new List<string> { "Android", "Android TV", "Android Wear" };

        //--------------------------------------
        // Public Methods
        //--------------------------------------

        protected void AddFeatureUrl(string title, string url)
        {
            var feature = new IMGUIDocumentationUrl(title, url);
            m_Features.Add(feature);
        }

        //--------------------------------------
        // Get / Set
        //--------------------------------------

        public bool IsSelected => m_IsSelected;

        //--------------------------------------
        // IMGUILayoutElement implementation
        //--------------------------------------

        public override void OnAwake()
        {
            m_BlockTitleLabel = new IMGUIHyperLabel(new GUIContent(Title), SA_PluginSettingsWindowStyles.LabelServiceBlockStyle);
            m_BlockTitleLabel.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);

            m_BlockAPIStateLabel = new IMGUIHyperLabel(new GUIContent("OFF"), OffStyle);
            m_BlockAPIStateLabel.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);

            m_ExpandOpenIcon = PluginsEditorSkin.GetGenericIcon("expand.png");
            m_ExpandClosedIcon = PluginsEditorSkin.GetGenericIcon("expand_close.png");
            m_ShowMoreButton = new IMGUIHyperLabel(new GUIContent(m_ExpandOpenIcon));
            m_ShowMoreButton.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);

            m_ONToggle = PluginsEditorSkin.GetGenericIcon("on_toggle.png");
            m_OffToggle = PluginsEditorSkin.GetGenericIcon("off_toggle.png");
            m_APIEnableButton = new IMGUIHyperLabel(new GUIContent(m_ONToggle));
            m_APIEnableButton.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
            m_APIEnableButton.GuiColorOverride(true);

            m_ShowExtraFields = new AnimBool(false);

            m_Features = new List<IMGUIDocumentationUrl>();
        }

        Rect m_LabelRect;
        const float k_DescriptionLabelOneLineHeight = 16f;

        public override void OnGUI()
        {
            if (m_SearchUIActive)
            {
                m_SearchUIActive = false;
                m_BlockTitleLabel.DisableHighLight();
                Collapse();
            }

            CheckServiceAvailability();
            DrawBlockUI();
        }

        public void OnSearchGUI(string pattern)
        {
            m_SearchUIActive = true;
            var valid = m_BlockTitleLabel.Content.text.ToLower().Contains(pattern.ToLower());
            m_BlockTitleLabel.HighLight(pattern);
            foreach (var feature in m_Features)
                if (feature.Content.text.ToLower().Contains(pattern.ToLower()))
                    valid = true;

            if (valid)
            {
                Expand();
                DrawBlockUI(pattern);
            }
            else
            {
                Collapse();
            }
        }

        public void UnSelect()
        {
            m_IsSelected = false;
        }

        void Expand()
        {
            m_ShowExtraFields.target = true;
        }

        void Collapse()
        {
            m_ShowExtraFields.target = false;
        }

        void DrawBlockUI(string pattern = null)
        {
            GUILayout.Space(5);

            bool titleClick;
            bool toggleClick;

            using (new IMGUIBeginHorizontal())
            {
                GUILayout.Space(10);
                GUILayout.Label(Icon, SA_PluginSettingsWindowStyles.LabelServiceBlockStyle, GUILayout.Width(IconSize), GUILayout.Height(IconSize));
                GUILayout.Space(5);

                using (new IMGUIBeginVertical())
                {
                    GUILayout.Space(TitleVerticalSpace);
                    titleClick = m_BlockTitleLabel.Draw(GUILayout.Height(25), GUILayout.Width(230));
                }

                GUILayout.FlexibleSpace();
                toggleClick = DrawServiceStateInfo();
            }

            if (titleClick || toggleClick) m_IsSelected = true;

            GUILayout.Space(5);
            using (new IMGUIBeginHorizontal())
            {
                GUILayout.Space(15);
                EditorGUILayout.LabelField(Description,  SettingsWindowStyles.DescriptionLabelStyle);

                if (Event.current.type == EventType.Repaint) m_LabelRect = GUILayoutUtility.GetLastRect();
                GUILayout.FlexibleSpace();
                using (new IMGUIBeginVertical())
                {
                    GUILayout.Space(m_LabelRect.height - k_DescriptionLabelOneLineHeight);
                    var click = m_ShowMoreButton.Draw(GUILayout.Height(22), GUILayout.Width(22));
                    if (click)
                        if (m_ShowExtraFields.faded.Equals(0f) || m_ShowExtraFields.faded.Equals(1f))
                        {
                            m_ShowExtraFields.target = !m_ShowExtraFields.target;
                            if (m_ShowExtraFields.target)
                                m_ShowMoreButton.SetContent(new GUIContent(m_ExpandClosedIcon));
                            else
                                m_ShowMoreButton.SetContent(new GUIContent(m_ExpandOpenIcon));
                        }
                }

                GUILayout.Space(5);
            }

            if (EditorGUILayout.BeginFadeGroup(m_ShowExtraFields.faded))
            {
                GUILayout.Space(5);
                DrawFeaturesList(pattern);
                GUILayout.Space(5);
            }

            EditorGUILayout.EndFadeGroup();

            GUILayout.Space(5);
            EditorGUILayout.BeginVertical(SettingsWindowStyles.SeparationStyle);
            GUILayout.Space(5);
            EditorGUILayout.EndVertical();
        }

        public void DrawHeaderUI()
        {
            CheckServiceAvailability();

            EditorGUILayout.BeginVertical(SettingsWindowStyles.SeparationStyle);
            {
                GUILayout.Space(20);
                EditorGUILayout.BeginHorizontal();
                {
                    GUILayout.Space( SettingsWindowStyles.IndentPixelSize);
                    EditorGUILayout.LabelField(Title, SettingsWindowStyles.LabelHeaderStyle);

                    GUILayout.FlexibleSpace();
                    DrawServiceStateInteractive();
                    GUILayout.Space( SettingsWindowStyles.IndentPixelSize);
                }
                EditorGUILayout.EndHorizontal();
                GUILayout.Space(8);

                EditorGUILayout.BeginHorizontal();
                {
                    GUILayout.Space( SettingsWindowStyles.IndentPixelSize);
                    EditorGUILayout.LabelField(Description,  SettingsWindowStyles.DescriptionLabelStyle);
                }
                EditorGUILayout.EndHorizontal();

                GUILayout.Space(25);
            }
            EditorGUILayout.EndVertical();
        }

        public virtual void DrawServiceUI()
        {
            DrawGettingStartedBlock();

            EditorGUI.BeginChangeCheck();
            {
                OnServiceUI();
            }
            if (EditorGUI.EndChangeCheck())
                Resolver.ResetRequirementsCache();

            DrawServiceRequirements();
            DrawSupportedPlatformsBlock();
        }

        protected virtual void DrawGettingStartedBlock()
        {
            using (new IMGUIWindowBlockWithIndent(new GUIContent("Getting Started")))
            {
                GettingStartedBlock();
                GUILayout.Space(-5);
                EditorGUI.indentLevel--;
                DrawFeaturesList();
                EditorGUI.indentLevel++;
            }
        }

        void DrawSupportedPlatformsBlock()
        {
            using (new SA_WindowBlockWithSpace(new GUIContent("Supported Platforms")))
            {
                using (new IMGUIBeginHorizontal())
                {
                    foreach (var platform in SupportedPlatforms) GUILayout.Label(platform, SA_PluginSettingsWindowStyles.AssetLabel);
                }
            }
        }

        protected virtual void GettingStartedBlock() { }

        protected virtual int IconSize => 25;

        protected virtual int TitleVerticalSpace => 4;

        public List<IMGUIDocumentationUrl> Features => m_Features;

        //--------------------------------------
        // Private Methods
        //--------------------------------------

        void DrawFeaturesList(string pattern = null)
        {
            EditorGUILayout.Space();

            List<IMGUIDocumentationUrl> m_drawableFeatures;
            if (string.IsNullOrEmpty(pattern))
            {
                m_drawableFeatures = m_Features;
                foreach (var feature in m_Features) feature.DisableHighLight();
            }
            else
            {
                m_drawableFeatures = new List<IMGUIDocumentationUrl>();
                foreach (var feature in m_Features)
                    if (feature.Content.text.ToLower().Contains(pattern.ToLower()))
                    {
                        feature.HighLight(pattern);
                        m_drawableFeatures.Add(feature);
                    }
            }

            using (new IMGUIIndentLevel(1))
            {
                for (var i = 0; i < m_drawableFeatures.Count; i += 2)
                {
                    EditorGUILayout.BeginHorizontal();

                    m_drawableFeatures[i].Draw(GUILayout.Width(150));
                    if (m_drawableFeatures.Count > i + 1) m_drawableFeatures[i + 1].Draw(GUILayout.Width(150));
                    GUILayout.FlexibleSpace();
                    EditorGUILayout.EndHorizontal();
                }

                EditorGUILayout.Space();
            }
        }

        protected virtual bool DrawServiceStateInfo()
        {
            var click = m_BlockAPIStateLabel.Draw(GUILayout.Height(25), GUILayout.Width(32));
            GUILayout.Space(5);

            return click;
        }

        protected virtual void DrawServiceStateInteractive()
        {
            if (CanBeDisabled)
            {
                var click = m_APIEnableButton.Draw(GUILayout.Width(50), GUILayout.Height(25));
                if (click)
                {
                    GUI.changed = true;
                    Resolver.IsSettingsEnabled = !Resolver.IsSettingsEnabled;
                }
            }
        }

        protected virtual void CheckServiceAvailability()
        {
            if (Resolver.IsSettingsEnabled)
            {
                m_BlockAPIStateLabel.SetStyle(OnStyle);
                m_BlockAPIStateLabel.SetContent(new GUIContent("ON"));

                m_APIEnableButton.SetContent(new GUIContent(m_ONToggle));
                m_APIEnableButton.SetColor(SA_PluginSettingsWindowStyles.SelectedImageColor);
                m_APIEnableButton.SetMouseOverColor(SA_PluginSettingsWindowStyles.SelectedImageColor);
            }
            else
            {
                m_BlockAPIStateLabel.SetStyle(OffStyle);
                m_BlockAPIStateLabel.SetContent(new GUIContent("OFF"));

                m_APIEnableButton.SetContent(new GUIContent(m_OffToggle));
                m_APIEnableButton.SetColor(  SettingsWindowStyles.DisabledImageColor);
                m_APIEnableButton.SetMouseOverColor(SA_PluginSettingsWindowStyles.SelectedImageColor);
            }
        }

        GUIStyle m_onStyle;

        GUIStyle OnStyle
        {
            get
            {
                if (m_onStyle == null)
                {
                    m_onStyle = new GUIStyle(SettingsWindowStyles.DescriptionLabelStyle);
                    m_onStyle.fontSize = 14;
                    m_onStyle.fontStyle = FontStyle.Bold;
                    m_onStyle.alignment = TextAnchor.MiddleRight;
                    m_onStyle.normal.textColor = SA_PluginSettingsWindowStyles.SelectedImageColor;
                }

                return m_onStyle;
            }
        }

        GUIStyle m_offStyle;

        GUIStyle OffStyle
        {
            get
            {
                if (m_offStyle == null)
                {
                    m_offStyle = new GUIStyle(OnStyle);
                    m_offStyle.normal.textColor =   SettingsWindowStyles.DisabledImageColor;
                }

                return m_offStyle;
            }
        }
    }
}
