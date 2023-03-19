using System;
using UnityEngine;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// A view controller that previews, opens, or prints files whose file format cannot be handled directly by your app.
    /// </summary>
    [Serializable]
    public class ISN_UIDocumentInteractionController
    {
        [SerializeField]
        string m_FileURL;

        [SerializeField]
        string m_UTI;

        [SerializeField]
        string m_Name;

        public ISN_UIDocumentInteractionController(string fileURL)
        {
            m_FileURL = fileURL;
        }
    }
}
