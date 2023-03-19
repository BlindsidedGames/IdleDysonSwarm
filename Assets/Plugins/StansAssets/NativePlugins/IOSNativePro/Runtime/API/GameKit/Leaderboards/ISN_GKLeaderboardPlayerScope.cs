namespace SA.iOS.GameKit
{
    /// <summary>
    /// The scope of players to be searched for scores.
    /// </summary>
    public enum ISN_GKLeaderboardPlayerScope
    {
        /// <summary>
        /// All players on Game Center should be considered when generating the list of scores.
        /// </summary>
        Global = 0,

        /// <summary>
        /// Only friends of the local player should be considered when generating the list of scores.
        /// </summary>
        FriendsOnly,
    }
}
