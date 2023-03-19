namespace SA.iOS.GameKit
{
    /// <summary>
    /// The period of time to which a player’s best score is restricted.
    /// </summary>
    public enum ISN_GKLeaderboardTimeScope
    {
        /// <summary>
        /// Each player is restricted to scores recorded in the past 24 hours.
        /// </summary>
        Today = 0,

        /// <summary>
        /// Each player is restricted to scores recorded in the past week.
        /// </summary>
        Week,

        /// <summary>
        /// Each player’s best score is returned.
        /// </summary>
        AllTime,
    }
}
