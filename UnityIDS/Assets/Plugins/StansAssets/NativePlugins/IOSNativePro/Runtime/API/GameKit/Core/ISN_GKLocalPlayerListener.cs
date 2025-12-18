////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using SA.Foundation.Events;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// A protocol that handles events for Game Center accounts.
    /// </summary>
    public static class ISN_GKLocalPlayerListener
    {
        /// <summary>
        /// Indicates that saved game data was modified.
        /// This method is usually called when a game is saved on device other than the device currently in use.
        /// </summary>
        public static SA_iEvent<ISN_GKSavedGameSaveResult> DidModifySavedGame => ISN_GKLib.Api.DidModifySavedGame;

        /// <summary>
        /// Invoked when a conflict arises between different versions of the same saved game.
        /// Saved game files conflict when multiple devices write to the same saved game file while one or more of the devices are offline.
        /// The app must determine which saved game data is the correct data to use and then call the ResolveConflicts <see cref="ISN_GKLocalPlayer"/>
        /// </summary>
        public static SA_iEvent<ISN_GKSavedGameFetchResult> HasConflictingSavedGames => ISN_GKLib.Api.HasConflictingSavedGames;
    }
}
