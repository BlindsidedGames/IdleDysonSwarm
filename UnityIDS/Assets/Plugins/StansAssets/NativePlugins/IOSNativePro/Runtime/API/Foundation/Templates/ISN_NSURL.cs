using System;
using UnityEngine;
using System.IO;

namespace SA.iOS.Foundation
{
    /// <summary>
    /// You can use URL objects to construct URLs and access their parts.
    /// For URLs that represent local files, you can also manipulate properties of those files directly,
    /// such as changing the file’s last modification date.
    /// Finally, you can pass URL objects to other APIs to retrieve the contents of those URLs.
    /// </summary>
    [Serializable]
    public class ISN_NSUrl
    {
        enum ISN_NSUrlType
        {
            Default = 0,
            File = 1,
        }

        [SerializeField]
        string m_Url = string.Empty;
        [SerializeField]
        ISN_NSUrlType m_Type;

        /// <summary>
        /// The initial url string it was created with
        /// All initial url string adjustments will take place inside the native plugin part
        /// </summary>
        /// <value>The URL.</value>
        public string Url => m_Url;

        /// <summary>
        /// The url type.
        /// Url will be transformed on native plugin side depending of url type
        /// </summary>
        /// <value>The type.</value>
        ISN_NSUrlType Type => m_Type;

        /// <summary>
        /// Creates and returns an NSURL object initialized with a provided URL string.
        /// </summary>
        /// <param name="url">
        /// The URL string with which to initialize the NSURL object.
        /// Must be a URL that conforms to RFC 2396.
        /// This method parses URLString according to RFCs 1738 and 1808..
        /// </param>
        public static ISN_NSUrl UrlWithString(string url)
        {
            var uri = new ISN_NSUrl();
            uri.m_Url = url;
            uri.m_Type = ISN_NSUrlType.Default;

            return uri;
        }

        [Obsolete("URLWithString deprecated. Use UrlWithString instead.")]
        public static ISN_NSUrl URLWithString(string url)
        {
            return UrlWithString(url);
        }

        /// <summary>
        /// Initializes and returns a newly created <see cref="ISN_NSUrl"/> object as a file URL with a specified path.
        /// </summary>
        /// <param name="path">The path that the <see cref="ISN_NSUrl"/> object will represent.
        /// path should be a valid system path, and must not be an empty path.
        /// </param>
        public static ISN_NSUrl FileUrlWithPath(string path)
        {
            var uri = new ISN_NSUrl();
            uri.m_Url = path;
            uri.m_Type = ISN_NSUrlType.File;

            return uri;
        }

        [Obsolete("FileURLWithPath deprecated. Use FileUrlWithPath instead.")]
        public static ISN_NSUrl FileURLWithPath(string path)
        {
            return FileUrlWithPath(path);
        }

        /// <summary>
        /// Initializes and returns a newly created <see cref="ISN_NSUrl"/> object as a file URL with a specified path
        /// relative to the unity StreamingAssets folder.
        /// </summary>
        /// <param name="path">The path that the <see cref="ISN_NSUrl"/> object will represent.
        /// path should be a valid StreamingAssets folder relative path, and must not be an empty path.
        /// </param>
        public static ISN_NSUrl StreamingAssetsUrlWithPath(string path)
        {
            var uri = new ISN_NSUrl
            {
                m_Url = Path.Combine(Application.streamingAssetsPath, path),
                m_Type = ISN_NSUrlType.File
            };

            return uri;
        }

        [Obsolete("StreamingAssetsURLWithPath deprecated. Use StreamingAssetsUrlWithPath instead.")]
        public static ISN_NSUrl StreamingAssetsURLWithPath(string path)
        {
            return StreamingAssetsUrlWithPath(path);
        }
    }

    [Obsolete("ISN_NSURL deprecated. Use ISN_NSUrl instead.")]
    public class ISN_NSURL : ISN_NSUrl { }
}
