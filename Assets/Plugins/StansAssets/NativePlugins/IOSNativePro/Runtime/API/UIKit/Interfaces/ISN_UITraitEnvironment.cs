namespace SA.iOS.UIKit
{
    /// <summary>
    /// A set of methods that makes the iOS interface environment available to your app.
    /// </summary>
    public interface ISN_UITraitEnvironment
    {
        /// <summary>
        /// The traits, such as the size class and scale factor, that describe the current environment of the object.
        /// </summary>
        ISN_UITraitCollection TraitCollection { get; }
    }
}
