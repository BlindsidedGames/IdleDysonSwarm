using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace SA.iOS.Foundation
{
    /// <summary>
    /// An object that specifies a date or time in terms of units (such as year, month, day, hour, and minute)
    /// to be evaluated in a calendar system and time zone.
    /// </summary>
    [Serializable]
    public class ISN_NSDateComponents
    {
        //--------------------------------------
        // Accessing Hours and Seconds
        //--------------------------------------

        /// <summary>
        /// The number of hour units for the receiver.
        /// </summary>
        public long Hour;

        /// <summary>
        /// The number of minute units for the receiver.
        /// </summary>
        public long Minute;

        /// <summary>
        /// The number of second units for the receiver.
        /// </summary>
        public long Second;

        /// <summary>
        /// The number of nanosecond units for the receiver.
        /// </summary>
        public long Nanosecond;

        //--------------------------------------
        // Accessing Years and Months
        //--------------------------------------

        /// <summary>
        /// The number of years.
        /// </summary>
        public long Year;

        /// <summary>
        /// The number of months.
        /// </summary>
        public long Month;

        /// <summary>
        /// The number of days.
        /// </summary>
        public long Day;

        /// <summary>
        /// The number of the weekdays.
        ///
        /// Weekday units are the numbers 1 through n, where n is the number of days in the week.
        /// For example, in the Gregorian calendar, n is 7 and Sunday is represented by 1.
        /// </summary>
        public long Weekday;
    }
}
