using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.Social
{
    /// <summary>
    /// Activity types for which the system has built-in support.
    /// </summary>
    public class ISN_UIActivityType
    {
        /// <summary>
        /// The object posts the provided content to the user’s wall on Facebook.
        /// </summary>
        public const string PostToFacebook = "com.apple.UIKit.activity.PostToFacebook";

        /// <summary>
        /// The object posts the provided content to the user’s Twitter feed.
        /// </summary>
        public const string PostToTwitter = "com.apple.UIKit.activity.PostToTwitter";

        /// <summary>
        /// The object posts the provided content to the user’s Weibo feed.
        /// </summary>
        public const string PostToWeibo = "com.apple.UIKit.activity.PostToWeibo";

        /// <summary>
        /// The object posts the provided content to the Messages app.
        /// </summary>
        public const string Message = "com.apple.UIKit.activity.Message";

        /// <summary>
        /// The object posts the provided content to a new email message.
        /// </summary>
        public const string Mail = "com.apple.UIKit.activity.Mail";

        /// <summary>
        /// The object prints the provided content.
        /// </summary>
        public const string Print = "com.apple.UIKit.activity.Print";

        /// <summary>
        /// The object posts the provided content to the pasteboard.
        /// </summary>
        public const string CopyToPasteboard = "com.apple.UIKit.activity.CopyToPasteboard";

        /// <summary>
        /// The object assigns the image to a contact.
        /// </summary>
        public const string AssignToContact = "com.apple.UIKit.activity.AssignToContact";

        /// <summary>
        /// The object assigns the image or video to the user’s camera roll.
        /// </summary>
        public const string SaveToCameraRoll = "com.apple.UIKit.activity.SaveToCameraRoll";

        /// <summary>
        /// The object adds the URL to Safari’s reading list
        /// </summary>
        public const string AddToReadingList = "com.apple.UIKit.activity.AddToReadingList";

        /// <summary>
        /// The object posts the provided image to the user’s Flickr account.
        /// </summary>
        public const string PostToFlickr = "com.apple.UIKit.activity.PostToFlickr";

        /// <summary>
        /// The object posts the provided video to the user’s Vimeo account
        /// </summary>
        public const string PostToVimeo = "com.apple.UIKit.activity.PostToVimeo";

        /// <summary>
        /// The object posts the provided content to the user’s Tencent Weibo feed.
        /// </summary>
        public const string PostToTencentWeibo = "com.apple.UIKit.activity.TencentWeibo";

        /// <summary>
        /// The object makes the provided content available via AirDrop.
        /// </summary>
        public const string AirDrop = "com.apple.UIKit.activity.AirDrop";

        /// <summary>
        /// The object opens the content in iBooks.
        /// </summary>
        public const string OpenInIBooks = "com.apple.UIKit.activity.OpenInIBooks";

        /// <summary>
        /// The object opens the content in Pdf.
        /// </summary>
        public const string MarkupAsPDF = "com.apple.UIKit.activity.MarkupAsPDF";
    }
}
