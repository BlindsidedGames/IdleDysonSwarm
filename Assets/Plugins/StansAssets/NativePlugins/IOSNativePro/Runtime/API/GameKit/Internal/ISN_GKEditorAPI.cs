////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;
using SA.Foundation.Events;
using SA.Foundation.Templates;

namespace SA.iOS.GameKit
{
    class ISN_GKEditorAPI : ISN_iGKAPI
    {
        readonly SA_Event<ISN_GKSavedGameSaveResult> m_DidModifySavedGame = new SA_Event<ISN_GKSavedGameSaveResult>();
        readonly SA_Event<ISN_GKSavedGameFetchResult> m_HasConflictingSavedGames = new SA_Event<ISN_GKSavedGameFetchResult>();

        public void AuthenticateLocalPlayer(Action<SA_Result> callback) { }

        public void ShowGameKitView(ISN_GKGameCenterViewController view, Action<SA_Result> callback) { }

        public void FetchSavedGames(Action<ISN_GKSavedGameFetchResult> callback) { }

        public void SavedGame(string name, string data, Action<ISN_GKSavedGameSaveResult> callback) { }

        public void DeleteSavedGame(ISN_GKSavedGame game, Action<SA_Result> callback) { }

        public void LoadGameData(ISN_GKSavedGame game, Action<ISN_GKSavedGameLoadResult> callback) { }

        public void ResolveConflictingSavedGames(ISN_GKResolveSavedGamesRequest request, Action<ISN_GKSavedGameFetchResult> callback) { }

        public SA_iEvent<ISN_GKSavedGameSaveResult> DidModifySavedGame => m_DidModifySavedGame;

        public SA_iEvent<ISN_GKSavedGameFetchResult> HasConflictingSavedGames => m_HasConflictingSavedGames;

        //--------------------------------------
        // GKPlayer
        //--------------------------------------

        public void GKPlayerLoadPhotoForSize(string playerId, int size, Action<ISN_GKImageLoadResult> callback)
        {
            var error = new SA_Error(1, "Can only be used on a real device");
            var result = new ISN_GKImageLoadResult(error);

            callback.Invoke(result);
        }

        //--------------------------------------
        // Achievements
        //--------------------------------------

        public void ResetAchievements(Action<SA_Result> callback) { }

        public void LoadAchievements(Action<ISN_GKAchievementsResult> callback) { }

        public void ReportAchievements(List<ISN_GKAchievement> achievements, Action<SA_Result> callback) { }

        //--------------------------------------
        // Leaderboards
        //--------------------------------------

        public void LoadLeaderboards(Action<ISN_GKLeaderboardsResult> callback) { }

        public void LoadScores(ISN_GKLeaderboard leaderboard, Action<ISN_GKScoreLoadResult> callback) { }

        public void ReportScore(ISN_GKScoreRequest scoresRequest, Action<SA_Result> callback) { }

        public void GenerateIdentityVerificationSignatureWithCompletionHandler(Action<ISN_GKIdentityVerificationSignatureResult> callback)
        {
            var error = new SA_Error(1, "Can't be used inside Unity editor");
            var result = new ISN_GKIdentityVerificationSignatureResult(error);

            callback.Invoke(result);
        }
    }
}
