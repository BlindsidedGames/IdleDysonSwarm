namespace SA.iOS.UIKit
{
    /// <summary>
    /// Class allows to show preloaders and lock application screen
    /// </summary>
    public static class ISN_Preloader
    {
        /// <summary>
        /// Locks the screen and displays a preloader spinner
        /// </summary>
        public static void LockScreen()
        {
            ISN_UILib.Api.PreloaderLockScreen();
        }

        /// <summary>
        /// Unlocks the screen and hide a preloader spinner
        /// In case there is no preloader displayed, method does nothing
        /// </summary>
        public static void UnlockScreen()
        {
            ISN_UILib.Api.PreloaderUnlockScreen();
        }
    }
}
