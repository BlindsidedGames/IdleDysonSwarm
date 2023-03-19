using System;
using System.Collections.Generic;
using UnityEngine;
using SA.Foundation.Templates;

namespace SA.iOS.GameKit
{
    [Serializable]
    public class ISN_GKScoreLoadResult : SA_Result
    {
        [SerializeField]
        List<ISN_GKScore> m_Scores = null;
        [SerializeField]
        ISN_GKLeaderboard m_Leaderboard = null;

        /// <summary>
        /// An array of <see cref="ISN_GKScore"/> objects that holds the requested scores.
        /// If an error occurred, this value may be non-nil.
        /// In this case, the array holds whatever score data could be retrieved from Game Center before the error occurred.
        /// </summary>
        public List<ISN_GKScore> Scores => m_Scores;

        /// <summary>
        /// Update Leaderboard request
        /// </summary>
        public ISN_GKLeaderboard Leaderboard => m_Leaderboard;
    }
}
