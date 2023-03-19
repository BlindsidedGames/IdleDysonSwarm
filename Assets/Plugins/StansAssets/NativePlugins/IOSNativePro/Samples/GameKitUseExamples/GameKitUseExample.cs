using System.Collections.Generic;
using System.Text;
using SA.iOS.GameKit;
using UnityEngine;

namespace SA.iOS.Examples
{
    public class GameKitUseExample : MonoBehaviour
    {
        List<ISN_GKSavedGame> m_FetchedSavedGames = new List<ISN_GKSavedGame>();
        readonly List<string> m_ConflictedSavedGames = new List<string>();

        void Awake()
        {
            ISN_GKLocalPlayerListener.DidModifySavedGame.AddListener(DidModifySavedGame);
            ISN_GKLocalPlayerListener.HasConflictingSavedGames.AddListener(HasConflictingSavedGames);
        }

        void OnDestroy()
        {
            ISN_GKLocalPlayerListener.DidModifySavedGame.RemoveListener(DidModifySavedGame);
            ISN_GKLocalPlayerListener.HasConflictingSavedGames.RemoveListener(HasConflictingSavedGames);
        }

        /// <summary>
        /// Indicates that saved game data was modified.
        /// This method is usually called when a game is saved on device other than the device currently in use.
        /// </summary>
        void DidModifySavedGame(ISN_GKSavedGameSaveResult result)
        {
            Debug.Log($"DidModifySavedGame! Device name = {result.SavedGame.DeviceName} " +
                $"| game name = {result.SavedGame.Name} | modification Date = {result.SavedGame.ModificationDate.ToString()}");
        }

        /// <summary>
        /// Invoked when a conflict arises between different versions of the same saved game.
        /// Saved game files conflict when multiple devices write to the same saved game file while one or more of the devices are offline.
        /// The app must determine which saved game data is the correct data to use and then call the ResolveConflicts <see cref="ISN_GKLocalPlayer"/>
        /// </summary>
        void HasConflictingSavedGames(ISN_GKSavedGameFetchResult result)
        {
            foreach (var game in result.SavedGames) m_ConflictedSavedGames.Add(game.Id);

            foreach (var game in result.SavedGames)
                Debug.Log($"HasConflictingSavedGames! Device name = {game.DeviceName} " +
                    $"| game name = {game.Name} | modification Date = {game.ModificationDate.ToString()}");
        }

        void OnGUI()
        {
            if (GUI.Button(new Rect(0, 0, 250, 50), "Authenticate"))
                ISN_GKLocalPlayer.SetAuthenticateHandler(result =>
                {
                    if (result.IsSucceeded)
                    {
                        Debug.Log("Authenticate is succeeded!");
                        var player = ISN_GKLocalPlayer.LocalPlayer;
                        Debug.Log($"player id: {player.PlayerId}");
                        Debug.Log($"player Alias: {player.Alias}");
                        Debug.Log($"player DisplayName: {player.DisplayName}");
                        Debug.Log($"player Authenticated: {player.Authenticated}");
                        Debug.Log($"player Underage: {player.Underage}");
                        player.GenerateIdentityVerificationSignatureWithCompletionHandler(signatureResult =>
                        {
                            if (signatureResult.IsSucceeded)
                            {
                                Debug.Log($"signatureResult.PublicKeyUrl: {signatureResult.PublicKeyUrl}");
                                Debug.Log($"signatureResult.Timestamp: {signatureResult.Timestamp}");
                                Debug.Log($"signatureResult.Salt.Length: {signatureResult.Salt.Length}");
                                Debug.Log($"signatureResult.Signature.Length: {signatureResult.Signature.Length}");
                            }
                            else
                            {
                                Debug.LogError($"IdentityVerificationSignature has failed: {signatureResult.Error.FullMessage}");
                            }
                        });
                    }
                    else
                    {
                        Debug.LogError($"Authenticate is failed! Error with code: {result.Error.Code} and description: {result.Error.Message}");
                    }
                });

            if (GUI.Button(new Rect(250, 0, 250, 50), "Get GKLocalPlayer"))
            {
                var localPlayer = ISN_GKLocalPlayer.LocalPlayer;
                Debug.Log($"PlayerID: {localPlayer.PlayerId} | Alias: {localPlayer.Alias} | DisplayName: {localPlayer.DisplayName}");
            }

            if (GUI.Button(new Rect(0, 50, 250, 50), "Is Authenticated?")) Debug.Log(ISN_GKLocalPlayer.LocalPlayer.Authenticated);

            if (GUI.Button(new Rect(250, 50, 250, 50), "Is Underage?")) Debug.Log(ISN_GKLocalPlayer.LocalPlayer.Underage);

            if (GUI.Button(new Rect(0, 200, 250, 50), "Fetch saved games"))
                ISN_GKLocalPlayer.FetchSavedGames(result =>
                {
                    if (result.IsSucceeded)
                    {
                        Debug.Log($"Loaded {result.SavedGames.Count} saved games");
                        foreach (var game in result.SavedGames)
                        {
                            Debug.Log($"saved game name: {game.Name}");
                            Debug.Log($"saved game DeviceName: {game.DeviceName}");
                            Debug.Log($"saved game ModificationDate: {game.ModificationDate}");
                        }

                        m_FetchedSavedGames = result.SavedGames;
                    }
                    else
                    {
                        Debug.LogError($"Fetching saved games is failed! With: {result.Error.Code} and description: {result.Error.Message}");
                    }
                });

            if (GUI.Button(new Rect(250, 200, 250, 50), "Save a game"))
            {
                byte[] data = { 1, 0, 1, 0, 1, 1, 1 };
                Debug.Log($"Sends byte array length {data.Length}");
                ISN_GKLocalPlayer.SavedGame("file_name", data, result =>
                {
                    if (result.IsSucceeded)
                    {
                        Debug.Log($"Saved game name: {result.SavedGame.Name}");
                        Debug.Log($"Saved game device name: {result.SavedGame.DeviceName}");
                        Debug.Log($"Saved game modification date: {result.SavedGame.ModificationDate}");

                        //Now let's just check we can load data for a newrly created game
                        result.SavedGame.Load(dataResult =>
                        {
                            if (dataResult.IsSucceeded)
                                Debug.Log("we made it!");
                            else
                                Debug.LogError("Error: {dataResult.Error.FullMessage}");
                        });
                    }
                    else
                    {
                        Debug.LogError($"SavedGame is failed! With: {result.Error.Code} and description: {result.Error.Message}");
                    }
                });
            }

            if (GUI.Button(new Rect(0, 250, 250, 50), "Save a game 2"))
            {
                var data = Encoding.UTF8.GetBytes("data AAA");
                Debug.Log($"Sends byte array length {data.Length}");
                ISN_GKLocalPlayer.SavedGame("new_file_name", data, result =>
                {
                    if (result.IsSucceeded)
                        Debug.Log($"SavedGame is succeeded! Device name = {result.SavedGame.DeviceName} | game name = {result.SavedGame.Name} | modification Date = {result.SavedGame.ModificationDate.ToString()}");
                    else
                        Debug.Log($"SavedGame is failed! With: {result.Error.Code} and description: {result.Error.Message}");
                });
            }

            if (GUI.Button(new Rect(250, 250, 250, 50), "Delete a game"))
                ISN_GKLocalPlayer.DeleteSavedGame(m_FetchedSavedGames[0], result =>
                {
                    if (result.IsSucceeded)
                        Debug.Log("DeleteSavedGame is succeeded!");
                    else
                        Debug.LogError($"DeleteSavedGame is failed! Error with code: {result.Error.Code} and description: {result.Error.Message}");
                });

            if (GUI.Button(new Rect(0, 300, 250, 50), "Load saved game data"))
                ISN_GKLocalPlayer.LoadGameData(m_FetchedSavedGames[0], result =>
                {
                    if (result.IsSucceeded)
                    {
                        Debug.Log($"Loading game data is succeeded! StringData = {result.StringData} byte array length: {result.BytesArrayData.Length}");
                        var myButes = string.Empty;
                        foreach (var b in result.BytesArrayData) myButes += b + ",";

                        Debug.Log($"BytesArrayData: {myButes}");
                    }
                    else
                    {
                        Debug.LogError($"Loading game data is failed! Error with code: {result.Error.Code} and description: {result.Error.Message}");
                    }
                });

            if (GUI.Button(new Rect(250, 300, 250, 50), "Resolve Saved Games Conflicts"))
            {
                //Choose correct data
                var data = Encoding.UTF8.GetBytes("data AAA");
                Debug.Log($"Sends byte array length {data.Length}");
                ISN_GKLocalPlayer.ResolveConflictingSavedGames(m_ConflictedSavedGames, data, result =>
                {
                    if (result.IsSucceeded)
                        Debug.Log("Resolve Conflicted Saved Games is succeeded!");
                    else
                        Debug.LogError("Resolve Conflicted Saved Games is failed!");
                });
            }

            if (GUI.Button(new Rect(0, 400, 250, 50), "Load Achivemnets"))
                ISN_GKAchievement.LoadAchievements(result =>
                {
                    if (result.IsSucceeded)
                        Debug.Log($"Loaded: {result.Achievements.Count} Achievements");

                    // m_achivemnets = result.Achievements;
                    else
                        Debug.LogError($"LoadAchievements failed! With: {result.Error.Code} and description: {result.Error.Message}");
                });

            if (GUI.Button(new Rect(250, 400, 250, 50), "Reset Achivemnets"))
                ISN_GKAchievement.ResetAchievements(result =>
                {
                    if (result.IsSucceeded)
                        Debug.Log("ResetAchievements succeeded");
                    else
                        Debug.Log($"LoadAchievements failed! With: {result.Error.Code} and description: {result.Error.Message}");
                });

            if (GUI.Button(new Rect(0, 450, 250, 50), "Report Achievements"))
            {
                var achievement1 = new ISN_GKAchievement("my_first_achievement");
                achievement1.PercentComplete = 50.0f;
                achievement1.Report(result =>
                {
                    if (result.IsSucceeded)
                        Debug.Log("ReportAchievements succeeded");
                    else
                        Debug.LogError($"LoadAchievements failed! With: {result.Error.Code} and description: {result.Error.Message}");
                });
            }

            if (GUI.Button(new Rect(250, 450, 250, 50), "SHOW Achievements UI"))
            {
                var viewController = new ISN_GKGameCenterViewController();
                viewController.ViewState = ISN_GKGameCenterViewControllerState.Achievements;
                viewController.Show();
            }

            if (GUI.Button(new Rect(0, 500, 250, 50), "SHOW Leaderboards "))
            {
                var viewController = new ISN_GKGameCenterViewController();
                viewController.ViewState = ISN_GKGameCenterViewControllerState.Leaderboards;
                viewController.Show();
            }

            if (GUI.Button(new Rect(250, 500, 250, 50), "SHOW Challenges "))
            {
                var viewController = new ISN_GKGameCenterViewController();
                viewController.ViewState = ISN_GKGameCenterViewControllerState.Challenges;
                viewController.Show(() =>
                {
                    Debug.Log("Challenges hided");
                });
            }
        }
    }
}
