using System;
using UnityEngine;

namespace SA.iOS.MediaPlayer
{
    /// <summary>
    /// A collection of properties that represents a single item contained in the media library.
    /// https://developer.apple.com/documentation/mediaplayer/mpmediaitem?language=objc
    /// </summary>
    [Serializable]
    public class ISN_MPMediaItem
    {
        [SerializeField]
        string m_Title = string.Empty;
        [SerializeField]
        string m_Artist = string.Empty;
        [SerializeField]
        string m_AlbumTitle = string.Empty;
        [SerializeField]
        string m_Composer = string.Empty;
        [SerializeField]
        string m_Genre = string.Empty;
        [SerializeField]
        string m_Lyrics = string.Empty;

        /// <summary>
        /// The title (or name) of the media item.
        /// </summary>
        public string Title => m_Title;

        /// <summary>
        /// The performing artist(s) for a media item—which may vary
        /// from the primary artist for the album that a media item belongs to.
        /// </summary>
        public string Artist => m_Artist;

        /// <summary>
        /// The title of an album, such as “Live On Mars”,
        /// as opposed to the title of an individual song on the album,
        /// such as “Crater Dance (radio edit)”.
        /// </summary>
        public string AlbumTitle => m_AlbumTitle;

        /// <summary>
        /// The musical composer for the media item.
        /// </summary>
        public string Composer => m_Composer;

        /// <summary>
        /// The musical or film genre of the media item.
        /// </summary>
        public string Genre => m_Genre;

        /// <summary>
        /// The lyrics for the media item.
        /// </summary>
        public string Lyrics => m_Lyrics;
    }
}
