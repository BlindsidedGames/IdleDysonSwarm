using System;
using System.Collections.Generic;
using SA.Foundation.Templates;
using SA.Foundation.Utility;
using SA.iOS.AVFoundation;
using SA.iOS.Utilities;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// A view controller that manages the system interfaces for taking pictures, recording movies,
    /// and choosing items from the user's media library.
    /// </summary>
    public class ISN_UIImagePickerController
    {
        readonly ISN_UIPickerControllerRequest m_Request = new ISN_UIPickerControllerRequest();

        //--------------------------------------
        // Public Methods
        //--------------------------------------

        /// <summary>
        /// Presents a view controller modally.
        ///
        /// If you configured the view controller to use <see cref="ISN_UIImagePickerControllerSourceType.Camera"/>,
        /// the <see cref="ISN_AVMediaType.Video"/> permission will be checked automatically,
        /// before presenting view controller. You can always do this yourself using the
        /// <see cref="ISN_AVCaptureDevice.RequestAccess"/>
        /// </summary>
        /// <param name="callback">Callback.</param>
        public void Present(Action<ISN_UIPickerControllerResult> callback)
        {
            //Need to make sure we have a permission for that
            if (m_Request.m_SourceType == ISN_UIImagePickerControllerSourceType.Camera)
                ISN_AVCaptureDevice.RequestAccess(ISN_AVMediaType.Video, (status) =>
                {
                    if (status == ISN_AVAuthorizationStatus.Authorized)
                    {
                        StartPresenting(callback);
                    }
                    else
                    {
                        var error = new SA_Error(1, "AVMediaType.Video Permission is missing");
                        var result = new ISN_UIPickerControllerResult(error);
                        callback.Invoke(result);
                    }
                });
            else
                StartPresenting(callback);
        }

        //--------------------------------------
        // Get / Set
        //--------------------------------------

        /// <summary>
        /// An array indicating the media types to be accessed by the media picker controller.
        ///
        /// Depending on the media types you assign to this property,
        /// the picker displays a dedicated interface for still images or movies,
        /// or a selection control that lets the user choose the picker interface.
        /// Before setting this property,
        /// check which media types are available by calling the <see cref="GetAvailableMediaTypes"/> class method.
        ///
        /// If you set this property to an empty array,
        /// or to an array in which none of the media types is available for the current source,
        /// the system throws an exception.
        ///
        /// You may use media type names from <see cref="ISN_UIMediaType"/>
        /// </summary>
        public List<string> MediaTypes
        {
            get => m_Request.m_MediaTypes;
            set => m_Request.m_MediaTypes = value;
        }

        /// <summary>
        /// The type of picker interface to be displayed by the controller.
        ///
        /// Prior to running the picker interface, set this value to the desired source type.
        /// The source type you set must be available and an exception is thrown if it is not.
        /// If you change this property while the picker is visible,
        /// the picker interface changes to match the new value in this property.
        /// The various source types are listed in the <see cref="ISN_UIImagePickerControllerSourceType"/> enumeration.
        /// The default value is <see cref="ISN_UIImagePickerControllerSourceType.PhotoLibrary"/>.
        /// </summary>
        public ISN_UIImagePickerControllerSourceType SourceType
        {
            get => m_Request.m_SourceType;
            set => m_Request.m_SourceType = value;
        }

        /// <summary>
        /// The camera used by the image picker controller.
        /// The default is <see cref="ISN_UIImagePickerControllerCameraDevice.Rear"/>
        /// </summary>
        public ISN_UIImagePickerControllerCameraDevice CameraDevice
        {
            get => m_Request.m_CameraDevice;
            set => m_Request.m_CameraDevice = value;
        }

        /// <summary>
        /// A Boolean value indicating whether the user is allowed to edit a selected still image or movie.
        /// This property is set to false by default.
        /// </summary>
        public bool AllowsEditing
        {
            get => m_Request.m_AllowsEditing;
            set => m_Request.m_AllowsEditing = value;
        }

        /// <summary>
        /// Is <see cref="ImageCompressionFormat"/> is set tp <see cref="ISN_UIImageCompressionFormat.JPEG"/>
        /// compression format value will be applied.
        ///
        /// The default value is 0.8f
        /// </summary>
        public float ImageCompressionRate
        {
            get => m_Request.m_ImageCompressionRate;
            set => m_Request.m_ImageCompressionRate = value;
        }

        /// <summary>
        /// Max allowed image size. If bigger image is picked by user, image will be resized before sending to Unity.
        /// Most of the images in user photo library are big, so it's better to use this property to save some RAM.
        ///
        /// The default value is 512
        /// </summary>
        /// <value>The size of the max image.</value>
        public int MaxImageSize
        {
            get => m_Request.m_MaxImageSize;
            set => m_Request.m_MaxImageSize = value;
        }

        /// <summary>
        /// Image compression format.
        /// Default value is JPEG
        /// </summary>
        public ISN_UIImageCompressionFormat ImageCompressionFormat
        {
            get => m_Request.m_EncodingType;
            set => m_Request.m_EncodingType = value;
        }

        /// <summary>
        /// The presentation style for modally presented view controllers.
        ///
        /// The presentation style determines how a modally presented view controller is displayed onscreen.
        /// In a horizontally compact environment, modal view controllers are always presented full-screen.
        /// In a horizontally regular environment, there are several different presentation options.
        ///
        /// The default value for this property is <see cref="ISN_UIModalPresentationStyle.Automatic"/>.
        /// For a list of possible presentation styles, and their compatibility with the available transition styles,
        /// see the <see cref="ISN_UIModalPresentationStyle"/> constant descriptions.
        /// </summary>
        public ISN_UIModalPresentationStyle ModalPresentationStyle
        {
            get => m_Request.m_ModalPresentationStyle;
            set
            {
                if (value == ISN_UIModalPresentationStyle.Automatic)
                {
                    var majorOSVersion = ISN_UIDevice.CurrentDevice.MajorIOSVersion;
                    if (majorOSVersion < 13)
                    {
                        value = ISN_UIModalPresentationStyle.FullScreen;
                        ISN_Logger.Log($"You are trying to use {nameof(ISN_UIModalPresentationStyle)}.{nameof(ISN_UIModalPresentationStyle.Automatic)} with iOS version less then 13, plugins will fallback to {nameof(ISN_UIModalPresentationStyle.FullScreen)}");
                    }
                }
                m_Request.m_ModalPresentationStyle = value;
            }
        }

        //--------------------------------------
        // Static Methods
        //--------------------------------------

        /// <summary>
        /// Saves the screen screenshot to the saved photos album.
        /// </summary>
        /// <param name="callback">Callback.</param>
        [Obsolete("use ISN_PhotoAlbum.SaveScreenshotToCameraRoll instead.")]
        public static void SaveScreenshotToCameraRoll(Action<SA_Result> callback)
        {
            SA_ScreenUtil.TakeScreenshot(texture =>
            {
                ISN_PhotoAlbum.UIImageWriteToSavedPhotosAlbum(texture, callback);
            });
        }

        /// <summary>
        /// Returns an array of the available media types for the specified source type.
        ///
        /// Some iOS devices support video recording.
        /// Use this method, along with the <see cref="IsSourceTypeAvailable"/> method,
        /// to determine if video recording is available on a device.
        /// </summary>
        /// <returns>The available media types.</returns>
        /// <param name="sourceType">The source to use to pick an image.</param>
        public static List<string> GetAvailableMediaTypes(ISN_UIImagePickerControllerSourceType sourceType)
        {
            return ISN_UILib.Api.GetAvailableMediaTypes(sourceType);
        }

        /// <summary>
        /// Returns a Boolean value indicating whether the device supports picking media using the specified source type.
        /// Because a media source may not be present or may be unavailable,
        /// devices may not always support all source types.
        /// For example, if you attempt to pick an image from the user’s library and the library is empty,
        /// this method returns <c>false</c>. Similarly, if the camera is already in use, this method returns <c>false</c>.
        ///
        /// Before attempting to use an <see cref="ISN_UIImagePickerController"/> object to pick an image,
        /// you must call this method to ensure that the desired source type is available.
        /// </summary>
        /// <param name="sourceType">Source Type.</param>
        /// <returns></returns>
        public static bool IsSourceTypeAvailable(ISN_UIImagePickerControllerSourceType sourceType)
        {
            return ISN_UILib.Api.IsSourceTypeAvailable(sourceType);
        }

        //--------------------------------------
        // Private Methods
        //--------------------------------------

        void StartPresenting(Action<ISN_UIPickerControllerResult> callback)
        {
            if (m_Request.m_MediaTypes.Count == 0)
                m_Request.m_MediaTypes = GetAvailableMediaTypes(m_Request.m_SourceType);

            ISN_UILib.Api.PresentPickerController(m_Request, callback);
        }
    }
}
