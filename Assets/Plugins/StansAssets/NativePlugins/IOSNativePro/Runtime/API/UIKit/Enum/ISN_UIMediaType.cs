using System;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// Constants of supported MediaType's by <see cref="ISN_UIImagePickerController"/>
    /// </summary>
    public class ISN_UIMediaType
    {
        /// <summary>
        /// Image type
        /// </summary>
        public const string Image = "public.image";

        /// <summary>
        /// Movie type
        /// </summary>
        public const string Movie = "public.movie";

        [Obsolete("IMAGE is deprecated, use Image instead.")]
        public static string IMAGE => Image;

        [Obsolete("MOVIE is deprecated, use Movie instead.")]
        public static string MOVIE => Movie;
    }
}
