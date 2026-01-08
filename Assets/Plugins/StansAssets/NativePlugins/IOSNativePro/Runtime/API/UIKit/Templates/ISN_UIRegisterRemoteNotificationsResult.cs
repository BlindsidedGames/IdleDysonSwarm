using System;
using System.Text;
using System.Collections.Generic;
using UnityEngine;
using SA.Foundation.Templates;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// Objects that delivers result of application attempt
    /// to registered with Apple Push Notification service (APNs).
    /// </summary>
    [Serializable]
    public class ISN_UIRegisterRemoteNotificationsResult : SA_Result
    {
        [SerializeField]
        string m_DeviceTokenUtf8 = null;

        /// <summary>
        /// The UFT8 string representation of <see cref="DeviceToken"/>
        /// </summary>
        public string DeviceTokenUTF8 => m_DeviceTokenUtf8;

        /// <summary>
        /// A token that identifies the device to APNs.
        /// The token is an opaque data type because that is the form that the provider needs to submit to the APNs servers
        /// when it sends a notification to a device.
        /// The APNs servers require a binary format for performance reasons.
        ///
        /// APNs device tokens are of variable length. Do not hard-code their size.
        ///
        /// Note that the device token is different from the
        /// <see cref="ISN_UIDevice.IdentifierForVendor"/> property of <see cref="ISN_UIDevice"/>, for security and privacy reasons,
        /// it must change when the device is wiped.
        /// </summary>
        public byte[] DeviceToken => Encoding.UTF8.GetBytes(m_DeviceTokenUtf8);
    }
}
