using System;
using UnityEngine;
using SA.Foundation.Templates;
using StansAssets.Foundation.Extensions;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// The <see cref="ISN_UIImagePickerController"/> interactions result.
    /// </summary>
    [Serializable]
    public class ISN_UIPickerControllerResult : SA_Result
    {
        [SerializeField]
        string m_EncodedImage = string.Empty;
        [SerializeField]
        string m_MediaUrl = string.Empty;
        [SerializeField]
        string m_ImageUrl = string.Empty;
        [SerializeField]
        string m_MediaType = string.Empty;

        Texture2D m_Texture;

        internal ISN_UIPickerControllerResult(SA_Error error)
            : base(error) { }

        /// <summary>
        /// Gets the selected texture.
        /// Value can be <c>null</c> in case user canceled selection, or picked video instead.
        /// </summary>
        /// <value>The texture.</value>
        public Texture2D Image
        {
            get
            {
                if (m_Texture == null)
                    if (!string.IsNullOrEmpty(m_EncodedImage))
                    {
                        m_Texture = new Texture2D(1, 1);
                        m_Texture.LoadFromBase64(m_EncodedImage);
                    }

                return m_Texture;
            }
        }

        /// <summary>
        /// Gets image raw bytes
        /// </summary>
        public byte[] RawBytes
        {
            get
            {
                if (string.IsNullOrEmpty(m_EncodedImage))
                    return null;

                return Convert.FromBase64String(m_EncodedImage);
            }
        }

        /// <summary>
        /// Specifies the media type selected by the user.
        /// The value for this key is an string object containing a type code such
        /// as <see cref="ISN_UIMediaType.Image"/> or <see cref="ISN_UIMediaType.Movie"/>.
        /// </summary>
        public string MediaType => m_MediaType;

        /// <summary>
        /// Specifies the filesystem URL for the movie.
        /// </summary>
        public string MediaURL
        {
            get
            {
                if (string.IsNullOrEmpty(m_MediaUrl))
                    return string.Empty;

                return m_MediaUrl.Replace("file:///private", string.Empty);
            }
        }

        /// <summary>
        /// Original filesystem URL for the movie returned by iOS SDK without any modifications.
        /// </summary>
        public string OriginalMediaURL => m_MediaUrl;

        /// <summary>
        /// A key containing the URL of the image file.
        /// </summary>
        public string ImageURL
        {
            get
            {
                if (string.IsNullOrEmpty(m_ImageUrl))
                    return string.Empty;

                return m_ImageUrl.Replace("file:///private", string.Empty);
            }
        }

        /// <summary>
        /// Original URL of the image file returned by iOS SDK without any modifications.
        /// </summary>
        public string OriginaImageURL => m_ImageUrl;
    }
}
