using System.Collections.Generic;
using System.Linq;

namespace SA.iOS.AuthenticationServices
{
    /// <summary>
    /// An OpenID authorization request.
    /// </summary>
    public abstract class ISN_ASAuthorizationOpenIDRequest : ISN_ASAuthorizationRequest
    {
        internal ISN_ASAuthorizationOpenIDRequest(ulong hash)
            : base(hash) { }

        /// <summary>
        /// The contact information to be requested from the user during authentication.
        /// </summary>
        /// <param name="scopes">Authorization Scopes list</param>
        public void SetRequestedScopes(IEnumerable<ISN_ASAuthorizationScope> scopes)
        {
            var scopesString = string.Join(",", scopes.Select(scope => scope.ToString()).ToArray());
            ISN_AuthenticationServicesLib._ISN_ASAuthorizationOpenIDRequest_setRequestedScopes(NativeHashCode, scopesString);
        }
    }
}
