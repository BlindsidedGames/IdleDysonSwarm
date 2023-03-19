////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

namespace SA.iOS.UIKit
{
    /// <summary>
    /// The mode displayed by the date picker.
    /// </summary>
    public enum ISN_UIDateTimePickerMode
    {
        /// <summary>
        /// Displays hour, minute, and optionally AM/PM designation
        /// depending on the locale setting (e.g. 6 | 53 | PM)
        /// </summary>
        Time = 1,

        /// <summary>
        /// Displays month, day, and year
        /// depending on the locale setting (e.g. November | 15 | 2007)
        /// </summary>
        Date = 2,

        /// <summary>
        /// Displays date, hour, minute, and optionally AM/PM designation
        /// depending on the locale setting (e.g. Wed Nov 15 | 6 | 53 | PM)
        /// </summary>
        DateAndTime = 3,

        /// <summary>
        /// Displays hour and minute (e.g. 1 | 53)
        /// </summary>
        CountdownTimer = 4,
    }
}
