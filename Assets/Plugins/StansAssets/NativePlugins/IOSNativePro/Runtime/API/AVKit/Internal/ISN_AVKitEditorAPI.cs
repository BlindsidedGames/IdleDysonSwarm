////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native 2018 - New Generation
// @author Stan's Assets team
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using UnityEngine;

namespace SA.iOS.AVKit.Internal
{
    class ISN_AVKitEditorAPI : ISN_iAVKitAPI
    {
        public void ShowPlayerViewController(ISN_AVPlayerViewController controller)
        {
            Application.OpenURL(controller.Player.Url.Url);
        }
    }
}
