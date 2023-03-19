using System;
using SA.Foundation.Templates;
using SA.Foundation.Utility;
using UnityEngine;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// Photo Album functions.
    /// </summary>
    public static class ISN_PhotoAlbum
    {
        /// <summary>
        /// Adds the specified image to the user’s Camera Roll album.
        /// </summary>
        /// <param name="texture">The image to write to the Camera Roll album.</param>
        /// <param name="callback">The callback to be called after the image has been written to the Camera Roll album.</param>
        public static void UIImageWriteToSavedPhotosAlbum(Texture2D texture, Action<SA_Result> callback)
        {
            ISN_PhotoAlbumNativeAPI.UIImageWriteToSavedPhotosAlbum(texture, callback);
        }

        /// <summary>
        /// Saves the screen screenshot to the saved photos album.
        /// </summary>
        /// <param name="callback">Callback.</param>
        public static void SaveScreenshotToCameraRoll(Action<SA_Result> callback)
        {
            SA_ScreenUtil.TakeScreenshot(texture =>
            {
                UIImageWriteToSavedPhotosAlbum(texture, callback);
            });
        }

        /// <summary>
        /// Returns a Boolean value indicating whether the specified video can be saved to user’s Camera Roll album.
        /// </summary>
        /// <param name="videoPath">The filesystem path to the movie file you want to save.</param>
        /// <returns><c>true</c> if the video can be saved to the Camera Roll album or <c>false</c> if it cannot.</returns>
        public static bool UIVideoAtPathIsCompatibleWithSavedPhotosAlbum(string videoPath)
        {
            return ISN_PhotoAlbumNativeAPI.UIVideoAtPathIsCompatibleWithSavedPhotosAlbum(videoPath);
        }

        /// <summary>
        /// Adds the movie at the specified path to the user’s Camera Roll album.
        /// </summary>
        /// <param name="videoPath">The filesystem path to the movie file you want to save to the Camera Roll album.</param>
        /// <param name="callback">The callback to be called after the movie has been written to the Camera Roll album.</param>
        public static void UISaveVideoAtPathToSavedPhotosAlbum(string videoPath, Action<SA_Result> callback)
        {
            ISN_PhotoAlbumNativeAPI.UISaveVideoAtPathToSavedPhotosAlbum(videoPath, callback);
        }
    }
}
