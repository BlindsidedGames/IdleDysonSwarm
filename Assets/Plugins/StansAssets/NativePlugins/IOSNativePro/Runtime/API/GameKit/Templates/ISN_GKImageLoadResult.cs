using System;
using UnityEngine;
using SA.Foundation.Templates;
using StansAssets.Foundation.Extensions;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// Object reflects an image load result.
    /// </summary>
    [Serializable]
    public class ISN_GKImageLoadResult : SA_Result
    {
        Texture2D m_Image;
        [SerializeField]
        string m_ImageBase64 = null;

        internal ISN_GKImageLoadResult(SA_Error error)
            : base(error) { }

        /// <summary>
        /// Loaded image.
        /// </summary>
        public Texture2D Image
        {
            get
            {
                if (m_Image == null)
                {
                    if (string.IsNullOrEmpty(m_ImageBase64)) return null;

                    m_Image = new Texture2D(1, 1);
                    m_Image.LoadFromBase64(m_ImageBase64);
                }

                return m_Image;
            }
        }
    }
}
