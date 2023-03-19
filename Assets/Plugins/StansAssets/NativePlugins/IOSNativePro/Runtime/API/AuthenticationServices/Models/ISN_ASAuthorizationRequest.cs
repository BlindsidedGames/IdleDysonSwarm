using SA.iOS.Utilities;

namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// A base class for different kinds of authorization requests.
    /// </summary>
    public abstract class ISN_ASAuthorizationRequest : ISN_NativeObject
    {
        internal ISN_ASAuthorizationRequest(ulong hash)
            : base(hash) { }
    }
}
