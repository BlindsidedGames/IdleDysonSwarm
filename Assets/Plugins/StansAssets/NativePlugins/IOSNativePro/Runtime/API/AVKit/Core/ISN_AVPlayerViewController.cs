using System;
using UnityEngine;
using SA.iOS.AVFoundation;
using SA.iOS.AVKit.Internal;

namespace SA.iOS.AVKit
{
    /// <summary>
    /// An object that displays the video content from a player object along with system-supplied playback controls.
    ///
    /// Using <see cref="ISN_AVPlayerViewController"/> makes it easy for you to add media playback capabilities
    /// to your application matching the styling and features of the native system players.
    /// Since <see cref="ISN_AVPlayerViewController"/> is a system framework class,
    /// your playback applications automatically adopt the new aesthetics and features
    /// of future operating system updates without any additional work from you.
    ///
    /// Important
    /// Do not subclass <see cref="ISN_AVPlayerViewController"/>.
    /// Overriding this class’s methods is unsupported and results in undefined behavior.
    /// </summary>
    [Serializable]
    public class ISN_AVPlayerViewController
    {
        [SerializeField]
        ISN_AVPlayer m_Player;
        [SerializeField]
        bool m_ShowsPlaybackControls = true;
        [SerializeField]
        bool m_AllowsPictureInPicturePlayback = true;
        [SerializeField]
        bool m_ShouldCloseWhenFinished = true;

        /// <summary>
        /// Show configured view controller
        /// </summary>
        public void Show()
        {
            ISN_AVKitLib.API.ShowPlayerViewController(this);
        }

        /// <summary>
        /// The player that provides the media content for the player view controller.
        /// </summary>
        public ISN_AVPlayer Player
        {
            get => m_Player;
            set => m_Player = value;
        }

        /// <summary>
        /// A Boolean value that indicates whether the player view controller shows playback controls.
        ///
        /// Default value is <c>true</c>.
        /// You can set this property to <c>false</c> if you don't want the system-provided playback controls visible over your content.
        /// Hiding the playback controls can be useful in situations where you need
        /// a non-interactive video presentation, such as a video splash screen.
        ///
        /// Do not use this property to change the visibility of the playback controls
        /// while the player view controller is onscreen, because doing so creates or destroys UI elements.
        /// </summary>
        public bool ShowsPlaybackControls
        {
            get => m_ShowsPlaybackControls;
            set => m_ShowsPlaybackControls = value;
        }

        /// <summary>
        /// A Boolean value that indicates whether the player view controller allows Picture in Picture playback on iPad.
        ///
        /// Default value is <c>true</c>.
        /// To disable Picture in Picture playback, set this value to false.
        /// </summary>
        public bool AllowsPictureInPicturePlayback
        {
            get => m_AllowsPictureInPicturePlayback;
            set => m_AllowsPictureInPicturePlayback = value;
        }

        /// <summary>
        /// A Boolean value that indicates whether the player view controller should automatically close,
        /// when current player item has finished playing.
        ///
        /// Default value is <c>true</c>.
        /// </summary>
        public bool ShouldCloseWhenFinished
        {
            get => m_ShouldCloseWhenFinished;
            set => m_ShouldCloseWhenFinished = value;
        }
    }
}
