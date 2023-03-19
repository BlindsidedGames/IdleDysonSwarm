namespace SA.iOS.MediaPlayer
{
    /// <summary>
    /// The protocol you implement so that a media item picker can respond to a user making media item selections.
    /// The delegate for a media item picker can respond to a user making media item selections.
    /// The delegate is also responsible for dismissing the media item picker from the parent view controller.
    /// </summary>
    public interface ISN_IMPMediaPickerControllerDelegate
    {
        /// <summary>
        /// Called when a user has selected a set of media items.
        /// </summary>
        /// <param name="mediaItemCollection">The selected media items.</param>
        /// <param name="mediaPicker">The media item picker to dismiss.</param>
        void DidPickMediaItems(ISN_MPMediaPickerController mediaPicker, ISN_MPMediaItemCollection mediaItemCollection);

        /// <summary>
        /// Called when a user dismisses a media item picker by tapping Cancel.
        /// </summary>
        /// <param name="mediaPicker">The media item picker to dismiss.</param>
        void MediaPickerDidCancel(ISN_MPMediaPickerController mediaPicker);
    }
}
