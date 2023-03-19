////////////////////////////////////////////////////////////////////////////////
//  
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets) 
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System.Collections.Generic;
using System.Text;
using UnityEngine;
using SA.iOS.Foundation;
using SA.iOS.AVFoundation;
using SA.iOS.AVKit;
using SA.iOS.UIKit;

namespace SA.iOS.Examples
{
    public class AVKitUseExample : MonoBehaviour
    {
        void OnGUI()
        {
            if (GUI.Button(new Rect(0, 0, 500, 100), "Playe Video By URL"))
            {
                var url = ISN_NSUrl.UrlWithString("https://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4");
                var player = new ISN_AVPlayer(url);

                var viewController = new ISN_AVPlayerViewController();
                viewController.Player = player;

                //Optional setting that you can apply
                player.Volume = 0.8f;

                viewController.ShowsPlaybackControls = true;
                viewController.AllowsPictureInPicturePlayback = false;
                viewController.ShouldCloseWhenFinished = false;

                viewController.Show();
            }

            if (GUI.Button(new Rect(300, 0, 500, 100), "Playe Video By URL no close"))
            {
                var url = ISN_NSUrl.UrlWithString("https://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4");
                var player = new ISN_AVPlayer(url);

                var viewController = new ISN_AVPlayerViewController();
                viewController.Player = player;

                //Optional setting that you can apply
                player.Volume = 0.8f;

                viewController.Show();
            }

            if (GUI.Button(new Rect(700, 0, 500, 100), "Playe LOCAL"))
            {
                var url = ISN_NSUrl.StreamingAssetsUrlWithPath("big_buck_bunny.mp4");
                var player = new ISN_AVPlayer(url);
                player.Volume = 0;

                var viewController = new ISN_AVPlayerViewController();
                viewController.Player = player;
                viewController.Show();
            }
        }
    }
}
