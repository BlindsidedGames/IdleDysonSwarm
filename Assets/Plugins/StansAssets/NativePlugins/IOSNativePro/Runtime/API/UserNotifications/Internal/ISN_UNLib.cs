////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;
using UnityEngine;
using SA.Foundation.Utility;

namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// This class is for plugin internal use only
    /// </summary>
    static class ISN_UNLib
    {
        static ISN_iUNAPI s_Api;

        public static ISN_iUNAPI Api
        {
            get
            {
                if (!ISN_Settings.Instance.UserNotifications) SA_Plugins.OnDisabledAPIUseAttempt(ISN_Settings.PluginTittle, "User Notifications");

                if (s_Api == null)
                {
                    if (Application.isEditor)
                        s_Api = new ISN_UNEditorAPI();
                    else
                        s_Api = ISN_UNNativeAPI.Instance;
                }

                return s_Api;
            }
        }
    }
}
