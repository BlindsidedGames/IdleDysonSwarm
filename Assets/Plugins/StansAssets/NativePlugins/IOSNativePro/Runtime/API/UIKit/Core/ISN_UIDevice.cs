#if UNITY_IPHONE || UNITY_TVOS
#define API_ENABLED
#endif

using System;
using UnityEngine;
#if API_ENABLED
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.UIKit
{
    /// <summary>
    /// A representation of the current device.
    /// </summary>
    [Serializable]
    public class ISN_UIDevice
    {
#if API_ENABLED
        [DllImport("__Internal")]
        static extern string _ISN_UI_GetCurrentDevice();
#endif

        [SerializeField]
        string m_Name = null;
        [SerializeField]
        string m_SystemName = null;
        [SerializeField]
        string m_Model = null;
        [SerializeField]
        string m_LocalizedModel = null;
        [SerializeField]
        string m_SystemVersion = null;
        [SerializeField]
        ISN_UIUserInterfaceIdiom m_UserInterfaceIdiom = ISN_UIUserInterfaceIdiom.IPad;

        [SerializeField]
        string m_IdentifierForVendor = null;

        //Additional fields
        [SerializeField]
        int m_MajorIOSVersion = 0;

        static ISN_UIDevice s_CurrentDevice;

        /// <summary>
        /// Returns an object representing the current device.
        /// You access the properties of the returned <see cref="ISN_UIDevice"/> instance to obtain information about the device.
        /// </summary>
        public static ISN_UIDevice CurrentDevice
        {
            get
            {
                if (s_CurrentDevice == null)
                {
#if API_ENABLED
                    var data = _ISN_UI_GetCurrentDevice();
                    s_CurrentDevice = JsonUtility.FromJson<ISN_UIDevice>(data);
#else
                    s_CurrentDevice = new ISN_UIDevice();
#endif
                }

                return s_CurrentDevice;
            }
        }

        /// <summary>
        /// The name identifying the device.
        /// The value of this property is an arbitrary alphanumeric string that is associated with the device as an identifier.
        /// For example, you can find the name of an iOS device in the General > About settings.
        /// </summary>
        public string Name => m_Name;

        /// <summary>
        /// The name of the operating system running on the device represented by the receiver.
        /// </summary>
        public string SystemName => m_SystemName;

        /// <summary>
        /// The model of the device.
        /// Possible examples of model strings are ”iPhone” and ”iPod touch”.
        /// </summary>
        public string Model => m_Model;

        /// <summary>
        /// The model of the device as a localized string.
        /// The value of this property is a string that contains a localized version of the string returned from <see cref="Model"/>.
        /// </summary>
        public string LocalizedModel => m_LocalizedModel;

        /// <summary>
        /// The current version of the operating system.
        /// </summary>
        public string SystemVersion => m_SystemVersion;

        /// <summary>
        /// The style of interface to use on the current device.
        ///
        /// For universal applications, you can use this property to tailor the behavior of your application for a specific type of device.
        /// For example, iPhone and iPad devices have different screen sizes, so you might want to create different views and controls
        /// based on the type of the current device.
        /// </summary>
        public ISN_UIUserInterfaceIdiom UserInterfaceIdiom => m_UserInterfaceIdiom;

        /// <summary>
        /// An alphanumeric string that uniquely identifies a device to the app’s vendor.
        ///
        /// The value of this property is the same for apps that comes from the same vendor running on the same device.
        /// A different value is returned for apps on the same device that come from different vendors, and for apps on different devices regardless of vendor.
        ///
        /// Normally, the vendor is determined by data provided by the App Store. If the app was not installed from the app store (such as enterprise apps and apps still in development),
        /// then a vendor identifier is calculated based on the app’s bundle ID.
        /// The bundle ID is assumed to be in reverse-DNS format.
        /// </summary>
        public string IdentifierForVendor => m_IdentifierForVendor;

        /// <summary>
        /// The current major version number of the operating system.
        /// Example: 11
        /// </summary>
        public int MajorIOSVersion => m_MajorIOSVersion;
    }
}
