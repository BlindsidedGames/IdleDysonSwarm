using System;
using System.Collections.Generic;
using UnityEngine;
using SA.iOS.Foundation;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// An object used to read data from a leaderboard stored on Game Center.
    /// </summary>
    [Serializable]
    public class ISN_GKLeaderboard
    {
        [SerializeField]
        string m_Identifier;
        [SerializeField]
        string m_Title;
        [SerializeField]
        string m_GroupIdentifier;
        [SerializeField]
        ISN_GKLeaderboardPlayerScope m_PlayerScope;
        [SerializeField]
        ISN_GKLeaderboardTimeScope m_TimeScope;
        [SerializeField]
        ISN_NSRange m_Range;
        [SerializeField]
        long m_MaxRange;
        [SerializeField]
        List<ISN_GKScore> m_Scores;
        [SerializeField]
        ISN_GKScore m_LocalPlayerScore;

        bool m_Loading;

        //--------------------------------------
        // Get / Set
        //--------------------------------------

        /// <summary>
        /// The named leaderboard to retrieve information from.
        ///
        /// If not empty, Game Center only returns scores from the matching leaderboard.
        /// If empty, all scores previously reported by the game are searched. Default is <see cref="string.Empty"/>.
        /// </summary>
        public string Identifier
        {
            get => m_Identifier;

            set => m_Identifier = value;
        }

        /// <summary>
        /// The identifier for the group the leaderboard is part of.
        ///
        /// If your game was configured to be part of a group in iTunes Connect,
        /// this property holds the identifier you assigned to the group.
        /// </summary>
        /// <value>The group identifier.</value>
        public string GroupIdentifier
        {
            get => m_GroupIdentifier;
            set => m_GroupIdentifier = value;
        }

        /// <summary>
        /// The localized title for the leaderboard.
        ///
        /// If you initialized a new leaderboard object,
        /// this property is invalid until a call to <see cref="LoadScores"/> is complete.
        /// Afterward, it contains the localized title for the leaderboard identified by the category property.
        /// </summary>
        public string Title
        {
            get => m_Title;
            set => m_Title = value;
        }

        /// <summary>
        /// A filter used to restrict the search to a subset of the players on Game Center.
        ///
        /// The playerScope property is ignored if the leaderboard request was initialized using the initWithPlayerIDs: method.
        /// Otherwise, the playerScope property determines which players are included in the request for high scores.
        /// The default is <see cref="ISN_GKLeaderboardPlayerScope.Global"/>. See <see cref="ISN_GKLeaderboardPlayerScope"/> for more information.
        /// </summary>
        public ISN_GKLeaderboardPlayerScope PlayerScope
        {
            get => m_PlayerScope;
            set => m_PlayerScope = value;
        }

        /// <summary>
        /// A filter used to restrict the search to scores that were posted within a specific period of time.
        ///
        /// This property determines how far back in time to look for scores.
        /// The default value is <see cref="ISN_GKLeaderboardTimeScope.AllTime"/>. See <see cref="ISN_GKLeaderboardTimeScope"/> for more information.
        /// </summary>
        public ISN_GKLeaderboardTimeScope TimeScope
        {
            get => m_TimeScope;
            set => m_TimeScope = value;
        }

        /// <summary>
        /// The numerical score rankings to return from the search.
        ///
        /// The range property is ignored if the leaderboard request was initialized using the initWithPlayerIDs: method.
        /// Otherwise, the range property is used to filter which scores are returned to your game.
        /// For example, if you specified a range of [1,10], after the search is complete, your game receives the best ten scores.
        /// The default range is [1,25].
        ///
        /// The minimum index is 1. The maximum length is 100.
        /// </summary>
        public ISN_NSRange Range
        {
            get => m_Range;
            set => m_Range = value;
        }

        /// <summary>
        /// The size of the leaderboard.
        ///
        /// This property is invalid until a call to <see cref="LoadScores"/> is completed.
        /// Afterward, it contains the total number of entries
        /// available to return to your game given the filters you applied to the query.
        /// </summary>
        public long MaxRange => m_MaxRange;

        /// <summary>
        /// A Boolean value that indicates whether the leaderboard object is retrieving scores.
        /// The value of the loading property is <c>true</c>
        /// if the leaderboard object has any pending requests for scores.
        /// </summary>
        public bool Loading => m_Loading;

        /// <summary>
        /// An array of GKScore objects that contains the scores returned by the search.
        ///
        /// This property is invalid until a call to <see cref="LoadScores"/> is complete.
        /// Afterward, it contains the same score objects that were returned to the completion handler.
        /// </summary>
        public List<ISN_GKScore> Scores => m_Scores;

        /// <summary>
        /// The score earned by the local player.
        ///
        /// This property is invalid until a call to <see cref="LoadScores"/>is completed.
        /// Afterward, it contains a score object representing the local player’s score
        /// on the leaderboard given the filters you applied to the query.
        /// </summary>
        public ISN_GKScore LocalPlayerScore => m_LocalPlayerScore;

        //--------------------------------------
        // Public Methods
        //--------------------------------------

        /// <summary>
        /// Retrieves a set of scores from Game Center.
        ///
        /// When this method is called, it creates a new background task to handle the request.
        /// The method then returns control to your game.
        /// Later, when the task is complete, Game Kit calls your completion handler.
        /// The completion handler is always called on the main thread.
        /// </summary>
        /// <param name="callback">A block to be called after the scores are retrieved from the server.</param>
        public void LoadScores(Action<ISN_GKScoreLoadResult> callback)
        {
            m_Loading = true;
            ISN_GKLib.Api.LoadScores(this, (ISN_GKScoreLoadResult result) =>
            {
                if (result.IsSucceeded)
                {
                    m_MaxRange = result.Leaderboard.MaxRange;
                    m_LocalPlayerScore = result.Leaderboard.LocalPlayerScore;
                    m_Scores = result.Leaderboard.Scores;
                }

                m_Loading = false;
                callback.Invoke(result);
            });
        }

        //--------------------------------------
        // Public Static Methods
        //--------------------------------------

        /// <summary>
        /// Loads the list of leaderboards from Game Center
        /// Use this class method to retrieve the list of leaderboards you configured on iTunes Connect.
        /// </summary>
        /// <param name="callback">A block that is called when the categories have been retrieved from the server.</param>
        public static void LoadLeaderboards(Action<ISN_GKLeaderboardsResult> callback)
        {
            ISN_GKLib.Api.LoadLeaderboards(callback);
        }
    }
}
