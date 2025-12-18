namespace SA.iOS.AVFoundation
{
    /// <summary>
    /// Constants that describe the state of the audio interruption.
    /// </summary>
    public enum ISN_AVAudioSessionInterruption
    {
        /// <summary>
        /// A type that indicates that the operating system began interrupting the audio session.
        /// </summary>
        Began = 1,

        /// <summary>
        /// A type that indicates that the operating system ended interrupting the audio session.
        /// </summary>
        Ended = 0,
    }
}
