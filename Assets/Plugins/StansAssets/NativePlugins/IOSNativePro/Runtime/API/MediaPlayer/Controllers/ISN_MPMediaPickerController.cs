using SA.iOS.UIKit;
using SA.iOS.Utilities;

namespace SA.iOS.MediaPlayer
{
    /// <summary>
    /// A specialized view controller that provides a graphical interface for selecting media items.
    /// Notes
    /// The MPMediaPickerController class supports portrait mode only.
    /// This class does support subclassing. The view hierarchy for this class is private; do not modify the view hierarchy.
    /// </summary>
    public class ISN_MPMediaPickerController : ISN_UIViewController
    {
        /// <summary>
        /// Initializes a media item picker for all media types.
        /// </summary>
        public ISN_MPMediaPickerController()
        {
            NativeHashCode = ISN_MPNativeAPI.MPMediaPickerController_Init();
        }

        /// <summary>
        /// A Boolean value specifying the default selection behavior for a media item picker.
        /// When set to `true`, the media item picker allows the selection of multiple media items.
        /// When set to `false`, only a single media item can be selected.
        /// The button for dismissing the picker is labeled “Cancel.” when set to `false` and "Done." when set to `true`.
        /// </summary>
        public bool AllowsPickingMultipleItems
        {
            get => ISN_MPNativeAPI.MPMediaPickerController_getAllowsPickingMultipleItems(NativeHashCode);
            set => ISN_MPNativeAPI.MPMediaPickerController_setAllowsPickingMultipleItems(NativeHashCode, value);
        }

        /// <summary>
        /// The delegate for a media item picker.
        ///
        /// Typically, you set the delegate to be the same object that initializes and displays the media item picker.
        /// The delegate protocol is described in <see cref="ISN_IMPMediaPickerControllerDelegate"/>.
        /// </summary>
        /// <param name="delegate">Media item picker delegate.</param>
        public void SetDelegate(ISN_IMPMediaPickerControllerDelegate @delegate)
        {
            ISN_MPNativeAPI.MPMediaPickerController_setDelegate(NativeHashCode,
                () =>
                {
                    @delegate.MediaPickerDidCancel(this);
                },
                collectionHash =>
                {
                    var collection = new ISN_MPMediaItemCollection(collectionHash);
                    @delegate.DidPickMediaItems(this, collection);
                });
        }
    }
}
