namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// Possible values for the credential state of a user.
    /// </summary>
    public enum ISN_ASAuthorizationAppleIDProviderCredentialState
    {
        /// <summary>
        /// Authorization for the given user has been revoked.
        /// </summary>
        Revoked,

        /// <summary>
        /// The user is authorized.
        /// </summary>
        Authorized,

        /// <summary>
        /// The user can’t be found.
        /// </summary>
        NotFound,

        /// <summary>
        /// Transferred
        /// </summary>
        Transferred,
    }
}
