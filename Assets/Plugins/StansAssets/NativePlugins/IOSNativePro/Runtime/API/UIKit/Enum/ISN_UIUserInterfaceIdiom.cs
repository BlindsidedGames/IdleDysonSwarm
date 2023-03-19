namespace SA.iOS.UIKit
{
    /// <summary>
    /// The type of interface that should be used on the current device
    /// </summary>
    public enum ISN_UIUserInterfaceIdiom
    {
        /// <summary>
        /// Unspecified
        /// </summary>
        Unspecified = -1,

        /// <summary>
        /// iPhone and iPod touch style UI
        /// </summary>
        Phone = 0,

        /// <summary>
        /// iPad style UI
        /// </summary>
        IPad = 1,

        /// <summary>
        ///  Apple TV style UI
        /// </summary>
        TV = 2,

        /// <summary>
        /// CarPlay style UI
        /// </summary>
        CarPlay = 3,
    }
}
