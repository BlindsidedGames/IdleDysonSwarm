namespace SA.iOS.Social
{
    /// <summary>
    /// These constants describe the result of the message-composition interface.
    /// </summary>
    public enum ISN_MessageComposeResult
    {
        /// <summary>
        /// The user canceled the composition.
        /// </summary>
        Cancelled,

        /// <summary>
        /// The user successfully queued or sent the message.
        /// </summary>
        Sent,

        /// <summary>
        /// The user’s attempt to save or send the message was unsuccessful.
        /// </summary>
        Failed,

        /// <summary>
        /// API is not supported by the current device.
        /// </summary>
        NotSupportedByDevice,
    }
}
