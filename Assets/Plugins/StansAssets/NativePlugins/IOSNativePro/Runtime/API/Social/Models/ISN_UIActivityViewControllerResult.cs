using System;
using System.Collections.Generic;
using UnityEngine;
using SA.Foundation.Templates;

namespace SA.iOS.Social
{
    /// <summary>
    /// Object that contains information about user interaction with the <see cref="ISN_UIActivityViewController"/>
    /// You can use this object to execute any final code related to the service.
    /// </summary>
    [Serializable]
    public class ISN_UIActivityViewControllerResult : SA_Result
    {
#pragma warning disable 649
        [SerializeField]
        string m_ActivityType;
        [SerializeField]
        bool m_Completed;
#pragma warning restore 649

        /// <summary>
        /// The type of the service that was selected by the user.
        /// For custom services, this is the value returned by the activityType method of a native UIActivity object.
        /// For system-defined activities, it is one of the strings listed in <see cref="ISN_UIActivityType"/> constants.
        /// </summary>
        public string ActivityType => m_ActivityType;

        /// <summary>
        /// <c>true</c> if the service was performed or <c>false</c> if it was not.
        /// This parameter is also set to <c>false</c>
        /// when the user dismisses the view controller without selecting a service.
        /// </summary>
        public bool Completed => m_Completed;
    }
}
