using UnityEngine;
using SA.Foundation.Utility;

namespace SA.iOS.ReplayKit
{
    /// <summary>
    /// This class is for plugin internal use only
    /// </summary>
    static class ISN_RPNativeLib
    {
        static ISN_iRRAPI s_Api;

        public static ISN_iRRAPI Api
        {
            get
            {
                if (!ISN_Settings.Instance.ReplayKit) SA_Plugins.OnDisabledAPIUseAttempt(ISN_Settings.PluginTittle, "Replay Kit");

                if (s_Api == null)
                {
                    if (Application.isEditor)
                        s_Api = new ISN_RPEditorAPI();
                    else
                        s_Api = ISN_RPNativeAPI.Instance;
                }

                return s_Api;
            }
        }
    }
}
