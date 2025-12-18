////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using SA.Foundation.Templates;
using System.Text;
using System.Collections.Generic;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// An object representing the authenticated Game Center player on a device.
    ///
    /// At any given time, only one player may be authenticated on the device;
    /// this player must log out before another player can log in.
    /// Your game must authenticate the local player before using any Game Center features.
    ///  Authenticating the player ensures that the player has created an account and is connected to Game Center.
    /// </summary>
    [Serializable]
    public class ISN_GKLocalPlayer : ISN_GKPlayer
    {
        static event Action<SA_Result> OnAuthenticateLocalPlayerComplete = delegate { };
        static event Action<SA_Result> OnDeleteSavedGameComplete = delegate { };

        static event Action<ISN_GKSavedGameFetchResult> OnFetchSavedGamesComplete = delegate { };
        static event Action<ISN_GKSavedGameSaveResult> OnSavedGameComplete = delegate { };
        static event Action<ISN_GKSavedGameLoadResult> OnLoadGameDataComplete = delegate { };
        static event Action<ISN_GKSavedGameFetchResult> OnResolveSavedGamesComplete = delegate { };

        static ISN_GKResolveSavedGamesRequest s_Request;
        static bool s_IsFetchSavedGamesInProgress;

        ISN_GKLocalPlayer()
            : base(1) { }

        /// <summary>
        /// A handler called to process an authentication-related event.
        ///
        /// Your game should authenticate the player as early as possible after launching,
        /// ideally as soon as you can present a user interface to the player.
        /// For example, your game may be launched because the player accepted an invitation to join a match
        /// or to take a turn in a turn-based match,
        /// so you want your game to authenticate the player
        /// and process the match invitation as quickly as possible.
        /// After you set a handler, authentication begins automatically
        /// and is repeated when your game moves to the background and then back to the foreground.
        /// </summary>
        /// <param name="callback">Authentication Result</param>
        public static void SetAuthenticateHandler(Action<SA_Result> callback)
        {
            OnAuthenticateLocalPlayerComplete = callback;
            ISN_GKLib.Api.AuthenticateLocalPlayer(result =>
            {
                OnAuthenticateLocalPlayerComplete.Invoke(result);
            });
        }

        /// <summary>
        /// Generates a signature that allows a third party server to authenticate the local player.
        ///
        /// When this method is called, it creates a new background task to handle the request.
        /// The method then returns control to your game.
        /// Later, when the task is complete, Game Kit calls your completion callback.
        /// The completion handler is always called on the main thread.
        /// </summary>
        /// <param name="callback">Background task completion callback.</param>
        public void GenerateIdentityVerificationSignatureWithCompletionHandler(Action<ISN_GKIdentityVerificationSignatureResult> callback)
        {
            ISN_GKLib.Api.GenerateIdentityVerificationSignatureWithCompletionHandler(callback);
        }

        /// <summary>
        /// Retrieves the shared instance of the local player.
        /// You never directly create a local player object. Instead, you retrieve the Singleton object by calling this class method.
        /// </summary>
        static ISN_GKLocalPlayer s_LocalPlayer;
        public static ISN_GKLocalPlayer LocalPlayer => s_LocalPlayer ?? (s_LocalPlayer = new ISN_GKLocalPlayer());

        /// <summary>
        /// A Boolean value that indicates whether a local player is currently signed in to Game Center.
        /// </summary>
        public bool Authenticated => ISN_GKLocalPlayerNative._ISN_GKLocalPlayer_isAuthenticated();

        /// <summary>
        /// A Boolean value that declares whether the local player is underage.
        /// Some Game Center features are disabled if the local player is underage.
        /// Your game can also test this property if it wants to disable some of its own features based on the player’s age.
        /// </summary>
        public bool Underage => ISN_GKLocalPlayerNative._ISN_GKLocalPlayer_isUnderage();

        /// <summary>
        /// Retrieves all available saved games.
        /// </summary>
        public static void FetchSavedGames(Action<ISN_GKSavedGameFetchResult> callback)
        {
            OnFetchSavedGamesComplete += callback;
            if (s_IsFetchSavedGamesInProgress) return;

            s_IsFetchSavedGamesInProgress = true;

            ISN_GKLib.Api.FetchSavedGames(result =>
            {
                s_IsFetchSavedGamesInProgress = false;

                OnFetchSavedGamesComplete.Invoke(result);
                OnFetchSavedGamesComplete = delegate { };
            });
        }

        /// <summary>
        /// Saves game data under the specified name.
        /// </summary>
        public static void SavedGame(string name, byte[] data, Action<ISN_GKSavedGameSaveResult> callback)
        {
            OnSavedGameComplete += callback;

            var stringData = Convert.ToBase64String(data);

            ISN_GKLib.Api.SavedGame(name, stringData, result =>
            {
                OnSavedGameComplete.Invoke(result);
                OnSavedGameComplete = delegate { };
            });
        }

        /// <summary>
        /// Deletes a specific saved game.
        /// </summary>
        public static void DeleteSavedGame(ISN_GKSavedGame game, Action<SA_Result> callback)
        {
            OnDeleteSavedGameComplete += callback;
            ISN_GKLib.Api.DeleteSavedGame(game, result =>
            {
                OnDeleteSavedGameComplete.Invoke(result);
                OnDeleteSavedGameComplete = delegate { };
            });
        }

        /// <summary>
        /// Loads specific saved game data.
        /// </summary>
        public static void LoadGameData(ISN_GKSavedGame game, Action<ISN_GKSavedGameLoadResult> callback)
        {
            OnLoadGameDataComplete += callback;

            ISN_GKLib.Api.LoadGameData(game, result =>
            {
                OnLoadGameDataComplete.Invoke(result);
                OnLoadGameDataComplete = delegate { };
            });
        }

        /// <summary>
        /// Resolves conflicted saved games.
        /// </summary>
        public static void ResolveConflictingSavedGames(List<string> conflictedGames, byte[] data, Action<ISN_GKSavedGameFetchResult> callback)
        {
            OnResolveSavedGamesComplete += callback;
            s_Request = new ISN_GKResolveSavedGamesRequest(conflictedGames, Encoding.UTF8.GetString(data));

            ISN_GKLib.Api.ResolveConflictingSavedGames(s_Request, result =>
            {
                OnResolveSavedGamesComplete.Invoke(result);
                OnResolveSavedGamesComplete = delegate { };
            });
        }

        /// <summary>
        /// Sets the default leaderboard for the current game.
        ///
        /// When this method is called, it creates a new background task to handle the request. The method then returns control to your game.
        /// Later, when the task is complete, Game Kit calls your completion handler.
        /// The completion handler is always called on the main thread.
        ///
        /// The default leaderboard is configured in App Store Connect as part of configuring your game’s leaderboards.
        /// All players normally start with this leaderboard as the default leaderboard.
        /// Calling this method changes the default leaderboard only for the local player.
        /// </summary>
        /// <param name="leaderboardIdentifier">The identifier of the leaderboard to be set as the default leaderboard.</param>
        /// <param name="callback">A block to be called when the request completes.</param>
        public void SetDefaultLeaderboardIdentifier(string leaderboardIdentifier, Action<SA_Result> callback)
        {
            ISN_GKNativeAPI.SetDefaultLeaderboardIdentifier(leaderboardIdentifier, callback);
        }

        /// <summary>
        /// Loads the category identifier for the local player’s default leaderboard.
        ///
        /// This method loads the default leaderboard set in App Store Connect.
        /// this method to retrieve the default leaderboard.
        ///
        /// When this method is called, it creates a new background task to handle the request. The method then returns control to your game.
        /// Later, when the task is complete, Game Kit calls your completion handler.
        /// The completion handler is always called on the main thread.
        /// </summary>
        /// <param name="callback">A block to be called when the request completes.</param>
        public void LoadDefaultLeaderboardIdentifier(Action<ISN_GKLoadDefaultLeaderboardResult> callback)
        {
            ISN_GKNativeAPI.LoadDefaultLeaderboardIdentifierWithCompletionHandler(result =>
            {
                var loadResult = new ISN_GKLoadDefaultLeaderboardResult(result);
                callback.Invoke(loadResult);
            });
        }
    }
}
