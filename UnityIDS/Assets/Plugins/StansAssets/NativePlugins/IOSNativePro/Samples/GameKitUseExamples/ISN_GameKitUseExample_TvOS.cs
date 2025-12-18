using SA.iOS.GameKit;
using SA.iOS.UIKit;
using UnityEngine;
using UnityEngine.UI;

public class ISN_GameKitUseExample_TvOS : MonoBehaviour
{
    [SerializeField]
    Button m_SingInButton = null;
    [SerializeField]
    Button m_LeaderboardsUI = null;
    [SerializeField]
    Button m_AchievementsUI = null;

    void Start()
    {
        m_SingInButton.onClick.AddListener(() =>
        {
            ISN_GKLocalPlayer.SetAuthenticateHandler(result =>
            {
                if (result.IsSucceeded)
                {
                    Debug.Log("Authenticate is succeeded!");

                    var player = ISN_GKLocalPlayer.LocalPlayer;
                    if (player.PlayerId != null)
                    {
                        Debug.Log(player.PlayerId);
                        Debug.Log(player.Alias);
                        Debug.Log(player.DisplayName);
                        Debug.Log(player.Authenticated);
                        Debug.Log(player.Underage);

                        SendMessage("Player Authenticate", "Alias: " + player.Alias + " ID: " + player.PlayerId);
                    }

                    player.GenerateIdentityVerificationSignatureWithCompletionHandler((signatureResult) =>
                    {
                        if (signatureResult.IsSucceeded)
                        {
                            Debug.Log("signatureResult.PublicKeyUrl: " + signatureResult.PublicKeyUrl);
                            Debug.Log("signatureResult.Timestamp: " + signatureResult.Timestamp);
                            Debug.Log("signatureResult.Salt.Length: " + signatureResult.Salt.Length);
                            Debug.Log("signatureResult.Signature.Length: " + signatureResult.Signature.Length);
                        }
                        else
                        {
                            Debug.Log("IdentityVerificationSignature has failed: " + signatureResult.Error.FullMessage);
                        }
                    });
                }
                else
                {
                    SendMessage("Failed", "Error with code: " + result.Error.Code + " and description: " + result.Error.Message);
                    Debug.Log("Authenticate is failed! Error with code: " + result.Error.Code + " and description: " + result.Error.Message);
                }
            });
        });

        m_LeaderboardsUI.onClick.AddListener(() =>
        {
            var viewController = new ISN_GKGameCenterViewController();
            viewController.ViewState = ISN_GKGameCenterViewControllerState.Leaderboards;
            viewController.Show();
        });

        m_AchievementsUI.onClick.AddListener(() =>
        {
            var viewController = new ISN_GKGameCenterViewController();
            viewController.ViewState = ISN_GKGameCenterViewControllerState.Achievements;
            viewController.Show();
        });
    }

    void ShowMessage(string title, string message)
    {
        var alert = new ISN_UIAlertController(title, message, ISN_UIAlertControllerStyle.Alert);
        var defaultAction = new ISN_UIAlertAction("Ok", ISN_UIAlertActionStyle.Default, () => { });

        alert.AddAction(defaultAction);
        alert.Present();
    }
}
