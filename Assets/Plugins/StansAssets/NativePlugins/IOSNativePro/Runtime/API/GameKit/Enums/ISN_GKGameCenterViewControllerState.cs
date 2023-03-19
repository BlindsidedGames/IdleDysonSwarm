////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

namespace SA.iOS.GameKit
{
    /// <summary>
    /// Possible values for the <see cref="ISN_GKGameCenterViewController"/> ViewState property.
    /// </summary>
    public enum ISN_GKGameCenterViewControllerState
    {
        /// <summary>
        /// Indicates that the view controller should present the default screen.
        /// </summary>
        Default = -1,

        /// <summary>
        /// Indicates that the view controller presents leaderboard content.
        /// </summary>
        Leaderboards = 0,

        /// <summary>
        /// Indicates that the view controller presents achievements content.
        /// </summary>
        Achievements = 1,

        /// <summary>
        /// Indicates that the view controller presents challenges content.
        /// </summary>
        Challenges = 2,
    }
}
