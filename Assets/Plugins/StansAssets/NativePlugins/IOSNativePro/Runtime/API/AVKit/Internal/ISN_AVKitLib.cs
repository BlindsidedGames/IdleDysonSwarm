using UnityEngine;
using SA.Foundation.Utility;

namespace SA.iOS.AVKit.Internal
{
    /// <summary>
    /// This class is for plugin internal use only
    /// </summary>
    static class ISN_AVKitLib
    {
        static ISN_iAVKitAPI s_Api;

        public static ISN_iAVKitAPI API
        {
            get
            {
                if (!ISN_Settings.Instance.AVKit)
                    SA_Plugins.OnDisabledAPIUseAttempt(ISN_Settings.PluginTittle, "AV Kit");

                if (s_Api == null)
                {
                    if (Application.isEditor)
                        s_Api = new ISN_AVKitEditorAPI();
                    else
                        s_Api = ISN_AVKitNativeAPI.Instance;
                }

                return s_Api;
            }
        }
    }
}
