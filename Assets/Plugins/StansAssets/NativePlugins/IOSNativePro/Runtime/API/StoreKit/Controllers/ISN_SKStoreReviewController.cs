////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native 2018 - New Generation
// @author Stan's Assets team
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

namespace SA.iOS.StoreKit
{
    /// <summary>
    /// Controls the process of requesting App Store ratings and reviews from users.
    /// </summary>
    public static class ISN_SKStoreReviewController
    {
        /// <summary>
        /// Use the <see cref="RequestReview"/>  method to indicate when it makes sense
        /// within the logic of your app to ask the user for ratings and reviews within your app.
        /// </summary>
        public static void RequestReview()
        {
            ISN_SKLib.Api.StoreRequestReview();
        }
    }
}
