using SA.iOS.Utilities;

namespace SA.iOS.MediaPlayer
{
    /// <summary>
    /// A sorted set of media items from the media library.
    /// </summary>
    public class ISN_MPMediaItemCollection : ISN_NativeObject
    {
        internal ISN_MPMediaItemCollection(ulong hasCode)
            : base(hasCode) { }
    }
}
