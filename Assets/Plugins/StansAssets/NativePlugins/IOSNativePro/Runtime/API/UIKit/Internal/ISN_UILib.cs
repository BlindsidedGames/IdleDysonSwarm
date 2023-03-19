using System;
using System.Collections.Generic;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// This class is for plugin internal use only
    /// </summary>
    static class ISN_UILib
    {
        static ISN_iUIAPI s_Api;
        public static ISN_iUIAPI Api => s_Api ?? (s_Api = ISN_UINativeAPI.Instance);

        [Serializable]
        public class SA_PluginSettingsWindowStylesRequest
        {
            public List<string> ProductIdentifiers = new List<string>();
        }
    }
}
