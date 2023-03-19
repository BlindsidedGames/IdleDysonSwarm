namespace SA.iOS.MediaPlayer
{
    /// <summary>
    /// The music player playback state modes.
    /// </summary>
    public enum ISN_MPMusicPlaybackState
    {
        /// <summary>
        /// The music player is stopped.
        /// </summary>
        Stopped = 0,

        /// <summary>
        /// The music player is playing.
        /// </summary>
        Playing = 1,

        /// <summary>
        /// The music player is paused.
        /// </summary>
        Paused = 2,

        /// <summary>
        /// The music player has been interrupted, such as by an incoming phone call.
        /// </summary>
        Interrupted = 3,

        /// <summary>
        /// The music player is seeking forward.
        /// </summary>
        SeekingForward = 4,

        /// <summary>
        /// The music player is seeking backward.
        /// </summary>
        SeekingBackward = 5,
    }
}
