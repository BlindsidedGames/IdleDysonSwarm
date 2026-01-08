using UnityEditor;
using UnityEngine;
using SA.Foundation.Config;

namespace SA.iOS
{
    static class ISN_EditorMenu
    {
        //--------------------------------------
        //  PUBLIC METHODS
        //--------------------------------------

        // WARNING: same menu item path is duplicated for settings UI.
        // if you need to change it here, make a proper config first.
        // do not change MenuItem path before you 100% what is mean by a statement above.

        [MenuItem(SA_Config.EditorMenuRoot + "iOS/Services", false, 299)]
        public static void Services()
        {
            var window = ISN_SettingsWindow.ShowTowardsInspector(WindowTitle);
            window.SetSelectedTabIndex(0);
        }

        [MenuItem(SA_Config.EditorMenuRoot + "iOS/XCode", false, 299)]
        public static void XCode()
        {
            var window = ISN_SettingsWindow.ShowTowardsInspector(WindowTitle);
            window.SetSelectedTabIndex(1);
        }

        [MenuItem(SA_Config.EditorMenuRoot + "iOS/Settings", false, 299)]
        public static void Settings()
        {
            var window = ISN_SettingsWindow.ShowTowardsInspector(WindowTitle);
            window.SetSelectedTabIndex(2);
        }

        [MenuItem(SA_Config.EditorMenuRoot + "iOS/Documentation", false, 300)]
        public static void ISDSetupPluginSetUp()
        {
            Application.OpenURL(ISN_Settings.DocumentationUrl);
        }

        static GUIContent WindowTitle => new GUIContent(ISN_Settings.PluginTittle, ISN_Skin.SettingsWindowIcon);
    }
}
