using SA.Foundation.Templates;
using SA.iOS.AuthenticationServices;
using UnityEngine;

namespace SA.iOS.Examples
{
    public class AuthorizationDelegateExample : ISN_IASAuthorizationControllerDelegate
    {
        public void DidCompleteWithAuthorization(ISN_ASAuthorizationAppleIDCredential credential)
        {
            Debug.LogError("Apple Sing In Completed: ");
            Debug.Log("credential.User: " + credential.User);
            Debug.Log("credential.Email: " + credential.Email);
            Debug.Log("credential.State: " + credential.State);

            Debug.Log("credential.AuthorizationCode: " + credential.AuthorizationCode);
            Debug.Log("credential.IdentityToken: " + credential.IdentityToken);

            Debug.Log("credential.FullName.Nickname: " + credential.FullName.Nickname);
            Debug.Log("credential.FullName.FamilyName: " + credential.FullName.FamilyName);
            Debug.Log("credential.FullName.GivenName: " + credential.FullName.GivenName);
            Debug.Log("credential.FullName.MiddleName: " + credential.FullName.MiddleName);
            Debug.Log("credential.FullName.NamePrefix: " + credential.FullName.NamePrefix);
            Debug.Log("credential.FullName.NameSuffix: " + credential.FullName.NameSuffix);
        }

        public void DidCompleteWithError(SA_Error error)
        {
            Debug.LogError("Apple Sing In Failed: " + error.FullMessage);
        }
    }
}
