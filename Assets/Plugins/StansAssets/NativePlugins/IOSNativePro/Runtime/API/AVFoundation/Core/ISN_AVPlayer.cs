using System;
using UnityEngine;
using SA.iOS.Foundation;

namespace SA.iOS.AVFoundation
{
    /// <summary>
    /// An object that provides the interface to control the player’s transport behavior.
    /// </summary>
    [Serializable]
    public class ISN_AVPlayer
    {
        [SerializeField]
        ISN_NSUrl m_Url;
        [SerializeField]
        float m_Volume = 1f;

        /// <summary>
        /// Initializes a new player to play a single audiovisual resource referenced by a given URL.
        /// </summary>
        /// <param name="url">A URL that identifies an audiovisual resource.</param>
        public ISN_AVPlayer(ISN_NSUrl url)
        {
            m_Url = url;
        }

        /// <summary>
        /// The audio playback volume for the player, ranging from 0.0 through 1.0 on a linear scale.
        ///
        /// A value of 0.0 indicates silence; a value of 1.0 (the default)
        /// indicates full audio volume for the player instance.
        ///
        /// This property is used to control the player audio volume relative to the system volume.
        /// There is no programmatic way to control the system volume in iOS,
        /// but you can use the MediaPlayer framework’s MPVolumeView class
        /// to present a standard user interface for controlling system volume.
        /// MPVolumeView is not yet implemented with the IOS Native plugin
        /// </summary>
        public float Volume
        {
            get => m_Volume;
            set => m_Volume = value;
        }

        /// <summary>
        /// A URL that identifies an audiovisual resource.
        /// </summary>
        public ISN_NSUrl Url => m_Url;
    }
}
