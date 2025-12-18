namespace SA.iOS.UserNotifications
{
    /// <summary>
    /// A sound to be played when a notification is delivered.
    /// </summary>
    public class ISN_UNNotificationSound
    {
        const string k_DefaultSound = "DefaultSound";

        /// <summary>
        ///  Creates new ISN_UNNotificationSound object with sounds name.
        /// </summary>
        /// <param name="name">The name of the sound file.</param>
        public ISN_UNNotificationSound(string name)
        {
            SoundName = name;
        }

        /// <summary>
        /// Sound file name
        /// </summary>
        /// <value>The name of the sound.</value>
        public string SoundName { get; }

        /// <summary>
        /// Returns an object representing the default sound for notifications.
        /// </summary>
        public static ISN_UNNotificationSound DefaultSound => new ISN_UNNotificationSound(k_DefaultSound);

        /// <summary>
        /// Creates and returns a notification sound object that plays the specified sound file.
        ///
        /// Make sure you've added sounds file to the XCode project with IOS Deploy settings
        /// Stan's Assets -> IOS Deploy Pro -> Setting  and look for a files section
        ///
        /// Also feel free to use another ways of adding sound ot the XCode project.
        /// Just keep in mind that file must be located in the current executable’s main bundle
        /// or in the Library/Sounds directory of the current app container directory.
        /// </summary>
        /// <param name="name">The name of the sound file to play. This file must be located in the current executable’s main bundle.</param>
        public static ISN_UNNotificationSound SoundNamed(string name)
        {
            return new ISN_UNNotificationSound(name);
        }
    }
}
