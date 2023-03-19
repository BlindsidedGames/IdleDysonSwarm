using System;
using UnityEngine;
using StansAssets.Foundation;
using StansAssets.Foundation.Extensions;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// An action that can be taken when the user taps a button in an alert.
    /// </summary>
    [Serializable]
    public class ISN_UIAlertAction
    {
        [SerializeField]
        int m_Id;
        [SerializeField]
        string m_Title;
        [SerializeField]
        ISN_UIAlertActionStyle m_Style;
        [SerializeField]
        bool m_Enabled = true;
        [SerializeField]
        bool m_Preferred = false;

#pragma warning disable 414
        [SerializeField]
        string m_Image;
#pragma warning restore 414

        Action m_Action;

        /// <summary>
        /// Create and return an action with the specified title and behavior.
        /// </summary>
        /// <param name="title">
        /// The text to use for the button title. The value you specify should be localized for the user’s current language.
        /// This parameter must not be nil, except in a tvOS app where a nil title may be used with <see cref="ISN_UIAlertActionStyle.Cancel"/>..
        /// </param>
        /// <param name="style">
        /// Additional styling information to apply to the button.
        /// Use the style information to convey the type of action that is performed by the button.
        /// For a list of possible values, see the constants in <see cref="ISN_UIAlertActionStyle"/>.
        /// </param>
        /// <param name="action">A block to execute when the user selects the action.</param>
        public ISN_UIAlertAction(string title, ISN_UIAlertActionStyle style, Action action)
        {
            m_Id = IdFactory.NextId;
            m_Title = title;
            m_Style = style;
            m_Action = action;
        }

        /// <summary>
        /// Gets the unique action identifier.
        /// </summary>
        public int Id => m_Id;

        /// <summary>
        /// The title of the action’s button.
        /// </summary>
        public string Title => m_Title;

        /// <summary>
        /// The style that is applied to the action’s button.
        /// </summary>
        public ISN_UIAlertActionStyle Style => m_Style;

        /// <summary>
        /// A Boolean value indicating whether the action is currently enabled.
        /// </summary>
        public bool Enabled
        {
            get => m_Enabled;

            set => m_Enabled = value;
        }

        /// <summary>
        /// True if action is proffered.
        /// </summary>
        public bool Preferred => m_Preferred;

        [Obsolete("Preffered is deprecated, use Preferred instead.")]
        public bool Preffered => m_Preferred;

        /// <summary>
        /// Adds an image to the action ui.
        /// </summary>
        /// <param name="image">Action Image. The image has to be readable.</param>
        public void SetImage(Texture2D image)
        {
            m_Image = image.ToBase64();
        }

        public void MakePreferred()
        {
            m_Preferred = true;
        }

        [Obsolete("MakePreffered is deprecated, use MakePreferred instead.")]
        public void MakePreffered()
        {
            MakePreferred();
        }

        public void Invoke()
        {
            m_Action.Invoke();
        }
    }
}
