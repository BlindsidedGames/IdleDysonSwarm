#if ((UNITY_IPHONE || UNITY_TVOS || UNITY_STANDALONE_OSX ) && GAME_KIT_API_ENABLED)
#define API_ENABLED
#endif

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
using SA.iOS.Utilities;
using UnityEngine;
#if API_ENABLED
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.GameKit
{
    class ISN_GKNativeAPI : ISN_Singleton<ISN_GKNativeAPI>, ISN_iGKAPI
    {
#if UNITY_IPHONE || UNITY_TVOS
        const string k_DllName = "__Internal";
#else
        private const string k_DllName = "ISN_GameKit";
#endif

#if API_ENABLED
        [DllImport(k_DllName)]
        static extern void _ISN_AuthenticateLocalPlayer(IntPtr callback, IntPtr didModifySavedGameCallback, IntPtr hasConflictingSavedGamesCallback);

        [DllImport(k_DllName)]
        static extern void _ISN_GKLocalPlayer_GenerateIdentityVerificationSignatureWithCompletionHandler(IntPtr callback);

        [DllImport(k_DllName)]
        static extern void _ISN_GKGameCenterViewControllerShow(string data, IntPtr callback);

        //Saved Games
        [DllImport(k_DllName)]
        static extern void _ISN_GKLocalPlayer_FetchSavedGames(IntPtr callback);

        [DllImport(k_DllName)]
        static extern void _ISN_GKLocalPlayer_SaveGameData(string name, string data, IntPtr callback);

        [DllImport(k_DllName)]
        static extern void _ISN_GKLocalPlayer_DeleteSavedGame(string name, string uniqueId, IntPtr callback);

        [DllImport(k_DllName)]
        static extern void _ISN_GKLocalPlayer_LoadGameData(string name, string uniqueId, IntPtr callback);

        [DllImport(k_DllName)]
        static extern void _ISN_GKLocalPlayer_ResolveSavedGames(string jsonContent, IntPtr callback);

        //Achievements
        [DllImport(k_DllName)]
        static extern void _ISN_GKAchievement_LoadAchievements(IntPtr callback);

        [DllImport(k_DllName)]
        static extern void _ISN_GKAchievement_ResetAchievements(IntPtr callback);

        [DllImport(k_DllName)]
        static extern void _ISN_GKAchievement_ReportAchievements(string contentJSON, IntPtr callback);

        //Leaderboards
        [DllImport(k_DllName)]
        static extern void _ISN_GKLeaderboard_LoadLeaderboards(IntPtr callback);

        [DllImport(k_DllName)]
        static extern void _ISN_GKLeaderboard_LoadScores(string leaderboardJSON, IntPtr callback);

        [DllImport(k_DllName)]
        static extern void _ISN_GKLeaderboard_ReportScore(string scoresJSON, IntPtr callback);

        //ISN_GKLocalPlayer
        [DllImport(k_DllName)]
        static extern void _ISN_GK_SetDefaultLeaderboardIdentifier(string identifier, IntPtr callback);

        [DllImport(k_DllName)]
        static extern void _ISN_GK_LoadDefaultLeaderboardIdentifierWithCompletionHandler(IntPtr callback);

#endif

        readonly SA_Event<ISN_GKSavedGameSaveResult> m_DidModifySavedGame = new SA_Event<ISN_GKSavedGameSaveResult>();
        readonly SA_Event<ISN_GKSavedGameFetchResult> m_HasConflictingSavedGames = new SA_Event<ISN_GKSavedGameFetchResult>();

        public void AuthenticateLocalPlayer(Action<SA_Result> callback)
        {
#if API_ENABLED
            _ISN_AuthenticateLocalPlayer(
                ISN_MonoPCallback.ActionToIntPtr(callback),
                ISN_MonoPCallback.ActionToIntPtr<ISN_GKSavedGameSaveResult>(m_DidModifySavedGame.Invoke),
                ISN_MonoPCallback.ActionToIntPtr<ISN_GKSavedGameFetchResult>(m_HasConflictingSavedGames.Invoke)
            );
#endif
        }

        public void GenerateIdentityVerificationSignatureWithCompletionHandler(Action<ISN_GKIdentityVerificationSignatureResult> callback)
        {
#if API_ENABLED
            _ISN_GKLocalPlayer_GenerateIdentityVerificationSignatureWithCompletionHandler(ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public SA_iEvent<ISN_GKSavedGameSaveResult> DidModifySavedGame => m_DidModifySavedGame;

        public SA_iEvent<ISN_GKSavedGameFetchResult> HasConflictingSavedGames => m_HasConflictingSavedGames;

        public void ShowGameKitView(ISN_GKGameCenterViewController view, Action<SA_Result> callback)
        {
#if API_ENABLED
            _ISN_GKGameCenterViewControllerShow(JsonUtility.ToJson(view), ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public void FetchSavedGames(Action<ISN_GKSavedGameFetchResult> callback)
        {
#if API_ENABLED
            _ISN_GKLocalPlayer_FetchSavedGames(ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public void SavedGame(string gameName, string data, Action<ISN_GKSavedGameSaveResult> callback)
        {
#if API_ENABLED
            _ISN_GKLocalPlayer_SaveGameData(gameName, data, ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public void DeleteSavedGame(ISN_GKSavedGame game, Action<SA_Result> callback)
        {
#if API_ENABLED
            _ISN_GKLocalPlayer_DeleteSavedGame(game.Name, game.Id, ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public void LoadGameData(ISN_GKSavedGame game, Action<ISN_GKSavedGameLoadResult> callback)
        {
#if API_ENABLED
            _ISN_GKLocalPlayer_LoadGameData(game.Name, game.Id, ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public void ResolveConflictingSavedGames(ISN_GKResolveSavedGamesRequest request, Action<ISN_GKSavedGameFetchResult> callback)
        {
#if API_ENABLED
            _ISN_GKLocalPlayer_ResolveSavedGames(JsonUtility.ToJson(request), ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        //--------------------------------------
        // Achievements
        //--------------------------------------

        public void LoadAchievements(Action<ISN_GKAchievementsResult> callback)
        {
#if API_ENABLED
            _ISN_GKAchievement_LoadAchievements(ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public void ResetAchievements(Action<SA_Result> callback)
        {
#if API_ENABLED
            _ISN_GKAchievement_ResetAchievements(ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public void ReportAchievements(List<ISN_GKAchievement> achievements, Action<SA_Result> callback)
        {
#if API_ENABLED
            var request = new ISN_GKAchievementsResult(achievements);
            _ISN_GKAchievement_ReportAchievements(JsonUtility.ToJson(request), ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        //--------------------------------------
        // Leaderboards
        //--------------------------------------

        public void LoadLeaderboards(Action<ISN_GKLeaderboardsResult> callback)
        {
#if API_ENABLED
            _ISN_GKLeaderboard_LoadLeaderboards(ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public void LoadScores(ISN_GKLeaderboard leaderboard, Action<ISN_GKScoreLoadResult> callback)
        {
#if API_ENABLED
            _ISN_GKLeaderboard_LoadScores(JsonUtility.ToJson(leaderboard), ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public void ReportScore(ISN_GKScoreRequest scoresRequest, Action<SA_Result> callback)
        {
#if API_ENABLED
            _ISN_GKLeaderboard_ReportScore(JsonUtility.ToJson(scoresRequest), ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        //--------------------------------------
        // GKLocalPlayer
        //--------------------------------------

        public static void SetDefaultLeaderboardIdentifier(string identifier, Action<SA_Result> callback)
        {
#if API_ENABLED
            _ISN_GK_SetDefaultLeaderboardIdentifier(identifier, ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        public static void LoadDefaultLeaderboardIdentifierWithCompletionHandler(Action<SA_DataResult> callback)
        {
#if API_ENABLED
            _ISN_GK_LoadDefaultLeaderboardIdentifierWithCompletionHandler(ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }
    }
}
