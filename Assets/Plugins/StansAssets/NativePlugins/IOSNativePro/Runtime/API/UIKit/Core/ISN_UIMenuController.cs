using System.Collections.Generic;
using UnityEngine;
using System;
using UnityEngine.Assertions;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// The menu interface for the Cut, Copy, Paste, Select, Select All, and Delete commands.
    /// The singleton ISN_UIMenuController instance is referred to as the editing menu.
    /// When you show this menu, ISN_UIMenuController positions it relative to position that u set in ShowMenuFromPosition method.
    /// The menu appears above the target position or, if there is not enough space for it, below it.
    /// You can also provide your own menu items via the MenuItems property.
    /// <summary>
    [Serializable]
    public class ISN_UIMenuController 
    {
        static ISN_UIMenuController m_SharedMenuController;

        /// <summary>
        /// Returns the menu controller.
        /// The shared ISN_UIMenuController instance.
        /// </summary>
        public static ISN_UIMenuController SharedMenuController 
        {
            get 
            {
                if (m_SharedMenuController == null)
                {
                    m_SharedMenuController = new ISN_UIMenuController();
                }
                return m_SharedMenuController;
            }
        }

        [SerializeField]
        float m_xPos;

        [SerializeField]
        float m_yPos;
       
        [SerializeField]
        List<string> m_MenuItems = new List<string>();

        /// <summary>
        /// The custom menu items for the editing menu.
        /// </summary>
        public List<string> MenuItems 
        {
            set => m_MenuItems = value;
            get => m_MenuItems;
        }

        /// <summary>
        /// Show the ISN_UIMenuController in a position above or below xPos and yPos you set.
        /// The menu appears above the target position or, if there is not enough space for it, below it.
        /// </summary>
        /// <param name="xPos"> x position for the center of ISN_UIMenuController. </param>
        /// <param name="yPos"> y position for the center of ISN_UIMenuController. </param>
        /// <param name="callback">
        /// This is callback that will be called from ISN_UIMenuController
        /// when user will pick some option.
        /// It shouldn't be null.
        /// </param>
        public void ShowMenuFromPosition(float xPos, float yPos, Action<ISN_UIMenuControllerResult> callback)
        {
            m_xPos = xPos;
            m_yPos = yPos;
            Assert.IsNotNull(callback);
            ISN_UILib.Api.ShowUIMenuControlleer(this, callback);
        }
    }
}
