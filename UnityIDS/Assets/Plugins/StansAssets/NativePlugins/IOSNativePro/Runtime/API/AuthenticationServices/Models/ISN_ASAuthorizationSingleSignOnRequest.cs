namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// An OpenID authorization request that provides single sign-on (SSO) functionality.
    /// </summary>
    public class ISN_ASAuthorizationSingleSignOnRequest : ISN_IASAuthorizationAppleIDRequest
    {
        internal ISN_ASAuthorizationSingleSignOnRequest(ulong hash)
            : base(hash) { }
    }
}
