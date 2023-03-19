using UnityEngine;
using SA.Foundation.Utility;

namespace SA.iOS.Contacts.Internal
{
    /// <summary>
    /// This class is for plugin internal use only
    /// </summary>
    static class ISN_CNLib
    {
        static ISN_iCNAPI s_Api = null;

        public static ISN_iCNAPI Api
        {
            get
            {
                if (!ISN_Settings.Instance.Contacts) SA_Plugins.OnDisabledAPIUseAttempt(ISN_Settings.PluginTittle, "Contacts");

                if (s_Api == null)
                {
                    if (Application.isEditor)
                        s_Api = new ISN_CNEditorAPI();
                    else
                        s_Api = ISN_CNNativeAPI.Instance;
                }

                return s_Api;
            }
        }
    }
}
