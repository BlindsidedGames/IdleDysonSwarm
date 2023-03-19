////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using UnityEngine;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// A single user interface used to display achievements and leaderboards supported by Game Center.
    /// </summary>
    [Serializable]
    public class ISN_GKGameCenterViewController
    {
        [SerializeField]
        string m_LeaderboardIdentifier = null;
        [SerializeField]
        ISN_GKLeaderboardTimeScope m_LeaderboardTimeScope = ISN_GKLeaderboardTimeScope.Today;
        [SerializeField]
        ISN_GKGameCenterViewControllerState m_ViewState = ISN_GKGameCenterViewControllerState.Default;

        /// <summary>
        /// Show configured view controller
        /// </summary>
        public void Show(Action callback = null)
        {
            ISN_GKLib.Api.ShowGameKitView(this, result =>
            {
                callback?.Invoke();
            });
        }

        /// <summary>
        /// The named leaderboard that is displayed by the view controller.
        /// The leaderboardIdentifier property must either be nil or it must match a leaderboard identifier
        /// you defined when you created your leaderboards on iTunes Connect. If nil, the view displays scores for the aggregate leaderboard.
        /// Default is nil.
        /// </summary>
        public string LeaderboardIdentifier
        {
            get => m_LeaderboardIdentifier;
            set => m_LeaderboardIdentifier = value;
        }

        /// <summary>
        /// Gets or sets the leaderboard time scope.
        /// </summary>
        /// <value>The leaderboard time scope.</value>
        public ISN_GKLeaderboardTimeScope LeaderboardTimeScope
        {
            get => m_LeaderboardTimeScope;
            set => m_LeaderboardTimeScope = value;
        }

        /// <summary>
        /// The content displayed by the Game Center view controller.
        /// </summary>
        public ISN_GKGameCenterViewControllerState ViewState
        {
            get => m_ViewState;
            set => m_ViewState = value;
        }
    }
}
