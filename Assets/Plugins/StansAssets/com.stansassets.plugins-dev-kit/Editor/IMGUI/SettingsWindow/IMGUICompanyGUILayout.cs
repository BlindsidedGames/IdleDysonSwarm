using UnityEditor;
using UnityEngine;

namespace StansAssets.Plugins.Editor
{
    public class IMGUICompanyGUILayout
    {
        static Texture2D s_Logo = null;
        public static Texture2D Logo
        {
            get
            {
                if (s_Logo == null)
                {
                    var icon = EditorGUIUtility.isProSkin ? "sa_logo_small.png" : "sa_logo_small_light.png";
                    s_Logo = PluginsEditorSkin.GetAboutIcon(icon);
                }

                return s_Logo;
            }
        }

        public static void DrawLogo()
        {
            var s = new GUIStyle();
            var content = new GUIContent(Logo, "Visit our website");

            var click = GUILayout.Button(content, s);
            if (click) Application.OpenURL(PluginsDevKitPackage.StansAssetsWebsiteRootUrl);
        }

        public static void ContactSupportWithSubject(string subject)
        {
            var url = "mailto:support@stansassets.com?subject=" + EscapeURL(subject);
            Application.OpenURL(url);
        }

        static string EscapeURL(string url)
        {
            return UnityEngine.Networking.UnityWebRequest.EscapeURL(url).Replace("+", "%20");

        }

        static readonly GUIContent s_SupportEmail = new GUIContent("Support [?]", "If you have any technical questions, feel free to drop us an e-mail");
        public static void SupportMail()
        {
            IMGUILayout.SelectableLabel(s_SupportEmail, PluginsDevKitPackage.StansAssetsSupportEmail);
        }
    }
}
