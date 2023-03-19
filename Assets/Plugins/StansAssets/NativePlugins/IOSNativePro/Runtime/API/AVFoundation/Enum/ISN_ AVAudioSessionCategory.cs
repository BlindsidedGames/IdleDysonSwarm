namespace SA.iOS.AVFoundation
{
    /// <summary>
    /// Audio session category identifiers.
    /// </summary>
    public enum ISN_AVAudioSessionCategory
    {
        /// <summary>
        ///The category for an app in which sound playback is nonprimary—that is, your app can be used successfully with the sound turned off.
        /// </summary>
        Ambient,

        /// <summary>
        /// The default audio session category.
        /// </summary>
        SoloAmbient,

        /// <summary>
        /// The category for playing recorded music or other sounds that are central to the successful use of your app.
        /// </summary>
        Playback,

        /// <summary>
        /// The category for recording audio; this category silences playback audio.
        /// </summary>
        Record,

        /// <summary>
        /// The category for recording (input) and playback (output) of audio, such as for a VoIP (Voice over Internet Protocol) app.
        /// </summary>
        PlayAndRecord,

        /// <summary>
        /// The category for routing distinct streams of audio data to different output devices at the same time.
        /// </summary>
        MultiRoute,
    }
}
