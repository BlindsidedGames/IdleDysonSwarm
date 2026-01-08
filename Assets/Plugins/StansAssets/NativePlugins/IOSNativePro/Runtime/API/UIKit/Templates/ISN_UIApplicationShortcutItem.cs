using System;
using UnityEngine;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// An application shortcut item,
    /// also called a Home screen dynamic quick action, that specifies a user-initiated action for your app.
    /// </summary>
    [Serializable]
    public class ISN_UIApplicationShortcutItem
    {
        [SerializeField]
        string m_Title = string.Empty;
        [SerializeField]
        string m_Subtitle = string.Empty;
        [SerializeField]
        string m_Type = string.Empty;

        internal ISN_UIApplicationShortcutItem(string type)
        {
            m_Type = type;
        }

        /// <summary>
        /// A required, app-specific string that you employ to identify the type of quick action to perform.
        /// </summary>
        /// <value>The type.</value>
        public string Type
        {
            get => m_Type;
            set => m_Type = value;
        }

        /// <summary>
        /// The quick action title
        /// </summary>
        public string Title
        {
            get => m_Title;
            set => m_Title = value;
        }

        /// <summary>
        /// The quick action title
        /// </summary>
        public string Subtitle
        {
            get => m_Subtitle;
            set => m_Subtitle = value;
        }
    }
}
