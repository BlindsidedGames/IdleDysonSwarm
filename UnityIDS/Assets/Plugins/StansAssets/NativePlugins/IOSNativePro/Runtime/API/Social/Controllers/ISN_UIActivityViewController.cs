using UnityEngine;
using System;
using System.Collections.Generic;
using SA.iOS.Utilities;
using StansAssets.Foundation.Extensions;
#if (UNITY_IPHONE && SOCIAL_API_ENABLED)
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.Social
{
    /// <summary>
    /// A view controller that you use to offer standard services from your app.
    ///
    /// The system provides several standard services, such as copying items to the pasteboard,
    /// posting content to social media sites, sending items via email or SMS, and more.
    /// Apps can also define custom services.
    ///
    /// Your app is responsible for configuring, presenting, and dismissing this view controller.
    /// Configuration for the view controller involves specifying the data objects on which the view controller should act.
    /// (You can also specify the list of custom services your app supports.)
    /// </summary>
    [Serializable]
    public class ISN_UIActivityViewController
    {
#if (UNITY_IPHONE && SOCIAL_API_ENABLED)
        [DllImport("__Internal")]
        static extern void _ISN_SOCIAL_PresentActivityViewController(string data, IntPtr callback);
#endif

#pragma warning disable 414

        [SerializeField]
        string m_Text = string.Empty;
        [SerializeField]
        List<string> m_Urls = new List<string>();
        [SerializeField]
        List<string> m_Images = new List<string>();
        [SerializeField]
        List<string> m_ExcludedActivityTypes = new List<string>();

#pragma warning restore 414

        /// <summary>
        /// Sets the text that will be used for sharing
        /// </summary>
        public void SetText(string text)
        {
            m_Text = text;
        }

        /// <summary>
        /// Adds an image to the sharing data
        /// </summary>
        public void AddImage(Texture2D image)
        {
            m_Images.Add(image.ToBase64());
        }

        /// <summary>
        /// Adds a URL to the sharing data
        /// </summary>
        public void AddUrl(string url)
        {
            m_Urls.Add(url);
        }

        /// <summary>
        /// This property contains an array of strings.
        /// Each string you specify indicates a service that you do not want displayed to the user.
        /// You might exclude services that you feel are not suitable for the content you are providing.
        /// For example, you might not want to allow the user to print a specific image.
        /// If the value of this property is empty, no services are excluded.
        /// This value of this property is empty by default.
        ///
        /// See the <see cref="ISN_UIActivityType"/> for a possible options.
        /// </summary>
        /// <value>The excluded activity types.</value>
        public List<string> ExcludedActivityTypes => m_ExcludedActivityTypes;

        /// <summary>
        /// Present Activity View Controller.
        /// </summary>
        /// <param name="callback">The complete callback.</param>
        public void Present(Action<ISN_UIActivityViewControllerResult> callback)
        {
            if (Application.isEditor)
            {
                var r = new ISN_UIActivityViewControllerResult();
                callback.Invoke(r);
                return;
            }

#if (UNITY_IPHONE && SOCIAL_API_ENABLED)
            var data = JsonUtility.ToJson(this);
            _ISN_SOCIAL_PresentActivityViewController(data, ISN_MonoPCallback.ActionToIntPtr<ISN_UIActivityViewControllerResult>((result) =>
            {
                callback.Invoke(result);
            }));
#endif
        }
    }
}
