using SA.iOS.Utilities;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// An object that defines the properties associated with a hardware-based display.
    /// </summary>
    public class ISN_UIScreen : ISN_NativeObject, ISN_UITraitEnvironment
    {
        static ISN_UIScreen s_MainScreen;

        internal ISN_UIScreen(ulong hash)
            : base(hash) { }

        /// <summary>
        /// Returns the screen object representing the device’s screen.
        /// </summary>
        public static ISN_UIScreen MainScreen
        {
            get
            {
                if (s_MainScreen == null)
                {
                    var hash = ISN_UILib.Api.UIScreen_MainScreen();
                    s_MainScreen = new ISN_UIScreen(hash);
                }

                return s_MainScreen;
            }
        }

        /// <summary>
        /// The traits, such as the size class and scale factor, that describe the current environment of the object.
        /// </summary>
        public ISN_UITraitCollection TraitCollection
        {
            get
            {
                var hash = ISN_UILib.Api.UIScreen_TraitCollection(NativeHashCode);
                return new ISN_UITraitCollection(hash);
            }
        }
    }
}
