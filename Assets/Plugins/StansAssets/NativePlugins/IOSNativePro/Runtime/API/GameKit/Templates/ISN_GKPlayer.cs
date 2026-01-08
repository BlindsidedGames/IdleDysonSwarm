////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using SA.iOS.Utilities;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// An object that provides information about a player on Game Center.
    ///
    /// Every player account on Game Center is permanently assigned a unique player identifier string.
    /// Your game should use this string to store per-player information or to disambiguate between players
    /// </summary>
    public class ISN_GKPlayer : ISN_NativeObject
    {
        internal ISN_GKPlayer(ulong hash)
            : base(hash) { }

        /// <summary>
        /// A unique identifier associated with a player.
        /// The player identifier should never be displayed to the player. Use it only as a way to identify a particular player.
        /// Do not make assumptions about the contents of the player identifier string. Its format and length are subject to change.
        /// </summary>
        public string PlayerId => ISN_GKPlayerNative._ISN_GKPlayer_playerId(NativeHashCode);

        [Obsolete("PlayerID is deprecated, use GamePlayerId & TeamPlayerId instead.")]
        public string PlayerID => PlayerId;

        /// <summary>
        /// A player’s alias is used when a player is not a friend of the local player.
        /// Typically, you never display the alias string directly in your user interface.
        /// Instead use the <see cref="DisplayName"/> property
        /// </summary>
        public string Alias => ISN_GKPlayerNative._ISN_GKPlayer_alias(NativeHashCode);

        /// <summary>
        /// The display name for a player depends on whether the player is a friend of the local player authenticated on the device.
        /// If the player is a friend of the local player, then the display name is the actual name of the player.
        /// If the player is not a friend, then the display name is the player’s alias.
        /// </summary>
        public string DisplayName => ISN_GKPlayerNative._ISN_GKPlayer_displayName(NativeHashCode);

        /// <summary>
        /// A developer created string used to identify a guest player.
        /// </summary>
        public string GuestIdentifier => ISN_GKPlayerNative._ISN_GKPlayer_guestIdentifier(NativeHashCode);

        /// <summary>
        /// Game player Id.
        /// See https://developer.apple.com/videos/play/wwdc2019/615/
        /// </summary>
        public string GamePlayerId => ISN_GKPlayerNative._ISN_GKPlayer_gamePlayerID(NativeHashCode);

        /// <summary>
        /// Team Player Id.
        /// See https://developer.apple.com/videos/play/wwdc2019/615/
        /// </summary>
        public string TeamPlayerId => ISN_GKPlayerNative._ISN_GKPlayer_teamPlayerID(NativeHashCode);

        /// <summary>
        /// Scoped Ids Are Persistent.
        /// See https://developer.apple.com/videos/play/wwdc2019/615/
        /// </summary>
        public bool ScopedIDsArePersistent => ISN_GKPlayerNative._ISN_GKPlayer_scopedIDsArePersistent(NativeHashCode);

        /// <summary>
        /// Loads a photo of this player from Game Center.
        /// </summary>
        /// <param name="size">A constant that determines the size of the photo to load.</param>
        /// <param name="callback">A block to be called when the player data is retrieved from Game Center.</param>
        public void LoadPhoto(GKPhotoSize size, Action<ISN_GKImageLoadResult> callback)
        {
            ISN_GKPlayerNative._ISN_GKPlayer_LoadPhotoForSize(NativeHashCode,
                (int)size,
                ISN_MonoPCallback.ActionToIntPtr(callback));
        }
    }
}
