using System;
using SA.Foundation.Templates;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// The result model for <see cref="ISN_GKLocalPlayer.LoadDefaultLeaderboardIdentifier"/>
    /// </summary>
    public class ISN_GKLoadDefaultLeaderboardResult : SA_DataResult
    {
        internal ISN_GKLoadDefaultLeaderboardResult(SA_DataResult dataResult)
            : base(dataResult) { }

        /// <summary>
        /// The category ID string for the local player’s default leaderboard.
        /// </summary>
        public string CategoryId => m_Data;

        [Obsolete("CategoryID is deprecated, use CategoryId instead.")]
        public string CategoryID => CategoryId;
    }
}
