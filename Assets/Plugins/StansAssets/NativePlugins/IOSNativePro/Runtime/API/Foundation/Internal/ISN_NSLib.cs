////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using UnityEngine;

namespace SA.iOS.Foundation
{
    static class ISN_NSLib
    {
        static ISN_NSAPI s_Api = null;

        public static ISN_NSAPI Api
        {
            get
            {
                if (s_Api == null)
                {
                    if (Application.isEditor)
                        s_Api = new ISN_NSEditorAPI();
                    else
                        s_Api = ISN_NSNativeAPI.Instance;
                }

                return s_Api;
            }
        }
    }
}
