using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using StansAssets.IOS.XCode;
using StansAssets.Plugins.Editor;

namespace SA.iOS
{
    class ISN_SettingsWindow : SA_PluginSettingsWindow<ISN_SettingsWindow>
    {
        [SerializeField]
        ISN_ServicesTab m_servicesTab;
        [SerializeField]
        IMGUIHyperLabel m_backLink;

        public const string DESCRIPTION = "The plugin gives you an ability to work with Apple Native API. " +
            "Every module that has additional XCode requirement can be disabled. " +
            "Enable only modules you need for the current project.";

        protected override void OnAwake()
        {
            SetHeaderTitle(ISN_Settings.PluginTittle);
            SetHeaderDescription(DESCRIPTION);
            SetHeaderVersion(ISN_Settings.FormattedVersion);
            SetDocumentationUrl(ISN_Settings.DocumentationUrl);

            m_servicesTab = CreateInstance<ISN_ServicesTab>();

            AddMenuItem("SERVICES", m_servicesTab);
            AddMenuItem("XCODE", CreateInstance<ISN_XCodeTab>());
            AddMenuItem("SETTINGS", CreateInstance<ISN_SettingsTab>());
            AddMenuItem("ABOUT", CreateInstance<IMGUIAboutTab>());

            var backIcon = PluginsEditorSkin.GetGenericIcon("back.png");
            m_backLink = new IMGUIHyperLabel(new GUIContent("Back To Services", backIcon), EditorStyles.miniLabel);
            m_backLink.SetMouseOverColor(SettingsWindowStyles.SelectedElementColor);
        }

        protected override void BeforeGUI()
        {
            EditorGUI.BeginChangeCheck();
        }

        protected override void OnLayoutGUI()
        {
            var selectedService = m_servicesTab.SelectedService;
            if (selectedService == null)
            {
                base.OnLayoutGUI();
                return;
            }

            DrawTopbar(() =>
            {
                var backClick = m_backLink.Draw();
                if (backClick) selectedService.UnSelect();
            });
            selectedService.DrawHeaderUI();
            DrawScrollView(() =>
            {
                selectedService.DrawServiceUI();
            });
        }

        protected override void AfterGUI()
        {
            if (EditorGUI.EndChangeCheck()) SaveSettings();
        }

        public static void SaveSettings()
        {
            ISN_Settings.Save();
            XCodeProjectSettings.Save();
            ISN_Preprocessor.Refresh();
        }
    }
}
