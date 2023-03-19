using System;
using SA.iOS.Utilities;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// An object that manages a view hierarchy for your UIKit app.
    /// </summary>
    [Serializable]
    public class ISN_UIViewController : ISN_NativeObject
    {
        /// <summary>
        /// Presents a view controller modally.
        ///
        /// In a horizontally regular environment, the view controller is presented in the style specified
        /// by the <see cref="ModalPresentationStyle"/> property. In a horizontally compact environment,
        /// the view controller is presented full screen by default.
        /// If you associate an adaptive delegate with the presentation controller associated with the object
        /// in viewControllerToPresent, you can modify the presentation style dynamically.
        ///
        /// The object on which you call this method may not always be the one that handles the presentation.
        /// Each presentation style has different rules governing its behavior.
        /// For example, a full-screen presentation must be made by a view controller that itself covers the entire screen.
        /// If the current view controller is unable to fulfill a request,
        /// it forwards the request up the view controller hierarchy to its nearest parent,
        /// which can then handle or forward the request.
        ///
        /// Before displaying the view controller, this method resizes the presented view controller's
        /// view based on the presentation style. For most presentation styles,
        /// the resulting view is then animated onscreen using the transition style in the
        /// modalTransitionStyle property of the presented view controller.
        /// For custom presentations, the view is animated onscreen using the presented view controller’s
        /// transitioning delegate. For current context presentations,
        /// the view may be animated onscreen using the current view controller’s transition style.
        ///
        ///  The completion handler is called after the viewDidAppear: method is called on the presented view controller.
        /// </summary>
        /// <param name="animated">Pass `true` to animate the presentation; otherwise, pass `false`.</param>
        /// <param name="completion">The block to execute after the presentation finishes.</param>
        public void PresentViewController(bool animated, Action completion)
        {
            ISN_UINativeAPI.UIViewController_presentViewController(NativeHashCode, animated, completion);
        }

        /// <summary>
        /// The presentation style for modally presented view controllers.
        ///
        /// The presentation style determines how a modally presented view controller is displayed onscreen.
        /// In a horizontally compact environment, modal view controllers are always presented full-screen.
        /// In a horizontally regular environment, there are several different presentation options.
        ///
        /// The default value for this property is <see cref="ISN_UIModalPresentationStyle.Automatic"/>
        /// For a list of possible presentation styles, and their compatibility with the available transition styles,
        /// see the <see cref="ISN_UIModalPresentationStyle"/> enum descriptions.
        /// </summary>
        public ISN_UIModalPresentationStyle ModalPresentationStyle
        {
            get => ISN_UINativeAPI.UIViewController_getModalPresentationStyle(NativeHashCode);
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

                ISN_UINativeAPI.UIViewController_setModalPresentationStyle(NativeHashCode, value);
            }
        }

        /// <summary>
        /// Dismisses the view controller that was presented modally by the view controller.
        ///
        /// The presenting view controller is responsible for dismissing the view controller it presented.
        /// If you call this method on the presented view controller itself, UIKit asks the presenting view controller to handle the dismissal.
        ///
        /// If you present several view controllers in succession, thus building a stack of presented view controllers,
        /// calling this method on a view controller lower in the stack dismisses its immediate child view controller
        /// and all view controllers above that child on the stack. When this happens,
        /// only the top-most view is dismissed in an animated fashion; any intermediate view controllers are simply removed from the stack.
        /// The top-most view is dismissed using its modal transition style, which may differ from the styles used by other view controllers lower in the stack.
        /// </summary>
        /// <param name="animated">Pass `true` to animate the transition.</param>
        /// <param name="completion">The block to execute after the view controller is dismissed.</param>
        public void Dismiss(bool animated, Action completion)
        {
            ISN_UINativeAPI.UIViewController_dismissViewControllerAnimated(NativeHashCode, animated, completion);
        }
    }
}
