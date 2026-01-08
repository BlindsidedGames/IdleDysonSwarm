namespace SA.iOS.UIKit
{
    /// <summary>
    /// Modal presentation styles available when presenting view controllers.
    /// </summary>
    public enum ISN_UIModalPresentationStyle
    {
        /// <summary>
        /// The views belonging to the presenting view controller are removed after the presentation completes.
        /// </summary>
        FullScreen = 0,

        /// <summary>
        /// In a horizontally and vertically regular environment,
        /// this option adds a dimming layer over the background content and displays the view controller's content
        /// with roughly page-sized dimensions, where the height is greater than the width.
        ///
        /// The actual dimensions vary according to the device's screen size and orientation,
        /// but a portion of the underlying content always remains visible.
        ///
        /// In a vertically regular, but horizontally compact environment,
        /// this option displays a sheet interface, where a portion of the underlying content remains visible near the top of the screen.
        ///
        ///  In a vertically compact environment, this option is essentially the same as <see cref="FullScreen"/>.
        /// </summary>
        PageSheet,

        /// <summary>
        /// In a horizontally and vertically regular environment,
        /// this option adds a dimming layer over the background content and displays the view controller's content centered on the screen.
        /// The actual dimensions are smaller than those of the <see cref="PageSheet"/> presentation style,
        /// and a portion of the underlying content always remains visible.
        ///
        /// In a vertically regular, but horizontally compact environment,
        /// this option displays a sheet interface, where a portion of the underlying content remains visible near the top of the screen.
        ///
        /// In a vertically compact environment, this option is essentially the same as <see cref="FullScreen"/>.
        /// </summary>
        FormSheet,

        /// <summary>
        /// A presentation style where the content is displayed over another view controller’s content.
        /// </summary>
        CurrentContext,

        /// <summary>
        /// A custom view presentation style that is managed by a custom presentation controller and one or more custom animator objects.
        /// </summary>
        Custom,

        /// <summary>
        /// A view presentation style in which the presented view covers the screen.
        ///
        /// The views beneath the presented content are not removed from the view hierarchy when the presentation finishes.
        /// So if the presented view controller does not fill the screen with opaque content, the underlying content shows through.
        /// </summary>
        OverFullScreen,

        /// <summary>
        /// A presentation style where the content is displayed over another view controller’s content.
        /// </summary>
        OverCurrentContext,

        /// <summary>
        /// A presentation style where the content is displayed in a popover view.
        /// </summary>
        Popover,

        /// <summary>
        /// A presentation style that blurs the underlying content before displaying new content in a full-screen presentation.
        /// </summary>
        BlurOverFullScreen,

        /// <summary>
        /// Do not use this style to present a view controller.
        /// Instead, return it from the adaptivePresentationStyleForPresentationController: method
        /// of an adaptive delegate when you do not want a presentation controller to adapt the style of an already presented view controller.
        /// </summary>
        None = -1,

        /// <summary>
        /// For most view controllers, UIKit maps this style to the <see cref="PageSheet"/> style,
        /// but some system view controllers may map it to a different style.
        /// </summary>
        Automatic = -2,
    }
}
