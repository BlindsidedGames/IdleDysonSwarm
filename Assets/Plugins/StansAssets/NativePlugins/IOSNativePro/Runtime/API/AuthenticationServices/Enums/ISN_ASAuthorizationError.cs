namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// Codes that authorization errors can have.
    /// </summary>
    public enum ISN_ASAuthorizationError
    {
        /// <summary>
        /// The authorization attempt failed for an unknown reason.
        /// </summary>
        Unknown = 1000,

        /// <summary>
        /// The user canceled the authorization attempt.
        /// </summary>
        Canceled = 1001,

        /// <summary>
        /// The authorization request received an invalid response.
        /// </summary>
        Response = 1002,

        /// <summary>
        /// The authorization request wasnt handled.
        /// </summary>
        NotHandled = 1003,

        /// <summary>
        /// The authorization attempt failed.
        /// </summary>
        Failed = 1004,
    }
}
