using System;
using SA.Foundation.Templates;
using SA.Foundation.Events;
using SA.iOS.AVFoundation.Internal;

namespace SA.iOS.AVFoundation
{
    /// <summary>
    /// An intermediary object that communicates to the system how you intend to use audio in your app.
    ///
    /// An audio session acts as an intermediary between your app and the operating system—and,
    /// in turn, the underlying audio hardware.
    /// You use an audio session to communicate to the operating system the nature of your app’s audio without detailing the specific behavior
    /// or required interactions with the audio hardware.
    /// This behavior delegates the management of those details to the audio session,
    /// which ensures that the operating system can best manage the user’s audio experience.
    /// </summary>
    public static class ISN_AVAudioSession
    {
        /// <summary>
        /// Sets the current audio session category.
        ///
        /// The audio session's category defines how the app intends to use audio.
        /// Typically, you set the category before activating the session.
        /// You can also set the category while the session is active, but this results in an immediate route change.
        /// </summary>
        /// <returns>Returns operation result info</returns>
        /// <param name="category">The audio session category to apply to the audio session.</param>
        public static SA_Result SetCategory(ISN_AVAudioSessionCategory category)
        {
            return ISN_AVLib.Api.AudioSessionSetCategory(category);
        }

        /// <summary>
        /// Sets the current audio session category.
        ///
        /// The audio session's category defines how the app intends to use audio.
        /// Typically, you set the category before activating the session.
        /// You can also set the category while the session is active, but this results in an immediate route change.
        /// </summary>
        /// <returns>Returns operation result info</returns>
        /// <param name="category">The audio session category to apply to the audio session.</param>
        /// <param name="options">A mask of additional options for handling audio. For a list of constants, <see cref="ISN_AVAudioSessionCategoryOptions"/></param>
        public static SA_Result SetCategory(ISN_AVAudioSessionCategory category, ISN_AVAudioSessionCategoryOptions options)
        {
            return ISN_AVLib.Api.AudioSessionSetCategoryWithOptions(category, options);
        }

        /// <summary>
        /// Activates or deactivates your app’s audio session.
        ///
        /// If another active audio session has higher priority than yours (for example, a phone call),
        /// and neither audio session allows mixing, attempting to activate your audio session fails.
        /// Deactivating your session will fail if any associated audio objects (such as queues, converters, players, or recorders) are currently running.
        /// </summary>
        /// <returns>Returns operation result info</returns>
        /// <param name="isActive">Use <c>true</c> to activate your app’s audio session, or <c>false</c> to deactivate it.</param>
        public static SA_Result SetActive(bool isActive)
        {
            return ISN_AVLib.Api.AudioSessionSetActive(isActive);
        }

        //--------------------------------------
        // Get / Set
        //--------------------------------------

        /// <summary>
        /// The current audio session category.
        /// An audio session category defines a set of audio behaviors for your app.
        /// The default category assigned to an audio session is <see cref="ISN_AVAudioSessionCategory.SoloAmbient"/>.
        /// </summary>
        public static ISN_AVAudioSessionCategory Category => ISN_AVLib.Api.AudioSessionCategory;

        /// <summary>
        /// The set of options associated with the current audio session category.
        ///
        /// You use category options to tailor the behavior of the active audio session category.
        /// See <see cref="ISN_AVAudioSessionCategoryOptions"/> for the supported values.
        /// </summary>
        public static ISN_AVAudioSessionCategoryOptions CategoryOptions => ISN_AVLib.Api.AudioSessionCategoryOptions;

        /// <summary>
        /// The event is posted when the system’s audio route changes.
        /// </summary>
        /// <value>The on audio session route change.</value>
        public static SA_iEvent<ISN_AVAudioSessionRouteChangeReason> OnAudioSessionRouteChange => ISN_AVLib.Api.OnAudioSessionRouteChange;

        /// <summary>
        /// A notification that’s posted when an audio interruption occurs.
        ///
        /// Starting in iOS 10, the system deactivates an app’s audio session when it suspends the app process.
        /// When the app starts running again, it receives an interruption notification that the system has deactivated its audio session.
        /// This notification is necessarily delayed in time because the system can only deliver it once the app is running again.
        /// </summary>
        public static event Action<ISN_AVAudioSessionInterruption> AVAudioSessionInterruptionNotification
        {
            add => ISN_AVLib.Api.AVAudioSessionInterruptionNotification += value;
            remove => ISN_AVLib.Api.AVAudioSessionInterruptionNotification -= value;
        }
    }
}
