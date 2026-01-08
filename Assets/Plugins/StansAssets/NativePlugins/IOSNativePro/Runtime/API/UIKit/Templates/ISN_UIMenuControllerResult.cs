using System;
using UnityEngine;
using SA.Foundation.Templates;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// This type for saving data from ISN_UIMenuController callback.
    /// </summary>
    [Serializable]
    public class ISN_UIMenuControllerResult : SA_Result
    {
        [SerializeField]
        protected int m_ChosenIndex;

        /// <summary>
        /// Get chosen value index from ISN_UIMenuController callback.
        /// </summary>
        public int ChosenIndex => m_ChosenIndex;
    }
}
