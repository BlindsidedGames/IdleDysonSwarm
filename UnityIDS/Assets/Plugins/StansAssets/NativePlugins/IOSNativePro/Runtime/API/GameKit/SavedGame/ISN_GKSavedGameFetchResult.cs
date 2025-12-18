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
using SA.Foundation.Templates;
using UnityEngine;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// Saved Game Fetch Result.
    /// </summary>
    [Serializable]
    public class ISN_GKSavedGameFetchResult : SA_Result
    {
        [SerializeField]
        List<ISN_GKSavedGame> m_SavedGames = new List<ISN_GKSavedGame>();

        ISN_GKSavedGameFetchResult(List<ISN_GKSavedGame> savedGames)
        {
            m_SavedGames = savedGames;
        }

        ISN_GKSavedGameFetchResult(SA_Error error)
            : base(error) { }

        /// <summary>
        /// Returns the saved games.
        /// </summary>
        public List<ISN_GKSavedGame> SavedGames => m_SavedGames;
    }
}
