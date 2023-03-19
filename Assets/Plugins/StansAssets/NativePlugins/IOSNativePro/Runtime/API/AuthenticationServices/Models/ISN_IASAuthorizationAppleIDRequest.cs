namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// An OpenID authorization request that relies on the user’s Apple ID.
    /// </summary>
    public abstract class ISN_IASAuthorizationAppleIDRequest : ISN_ASAuthorizationOpenIDRequest
    {
        internal ISN_IASAuthorizationAppleIDRequest(ulong hash)
            : base(hash) { }
    }
}
