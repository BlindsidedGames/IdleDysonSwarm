namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// The kinds of contact information that can be requested from the user.
    /// </summary>
    public enum ISN_ASAuthorizationScope
    {
        /// <summary>
        /// A scope that includes the user’s email address.
        /// </summary>
        Email,

        /// <summary>
        /// A scope that includes the user’s full name.
        /// </summary>
        FullName,
    }
}
