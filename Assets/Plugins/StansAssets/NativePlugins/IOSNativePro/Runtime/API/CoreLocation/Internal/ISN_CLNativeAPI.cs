#if (UNITY_IPHONE || UNITY_IOS) && CORE_LOCATION_API_ENABLED && !UNITY_EDITOR
 #define API_ENABLED
#endif

#if API_ENABLED
using System;
using System.Runtime.InteropServices;
using SA.Foundation.Templates;
using SA.iOS.Utilities;
using UnityEngine;

#endif

namespace SA.iOS.CoreLocation
{
    /// <summary>
    /// The object that you use to start and stop the delivery of location-related events to your app.
    /// </summary>
    static class ISN_CLNativeAPI
    {
#if API_ENABLED
        [DllImport("__Internal")] static extern bool _ISN_CL_LocationServicesEnabled();

        [DllImport("__Internal")] static extern int  _ISN_CL_AuthorizationStatus();
        [DllImport("__Internal")] static extern void _ISN_CL_RequestAlwaysAuthorization();
        [DllImport("__Internal")] static extern void _ISN_CL_RequestWhenInUseAuthorization();

        [DllImport("__Internal")]
        static extern void _ISN_CL_SetDelegate(
            IntPtr authorization,
            IntPtr update,
            IntPtr error,
            IntPtr finishDeferred,
            IntPtr pause,
            IntPtr resume);

        [DllImport("__Internal")] static extern void _ISN_CL_RequestLocation();
        [DllImport("__Internal")] static extern void _ISN_CL_StartUpdatingLocation();
        [DllImport("__Internal")] static extern void _ISN_CL_StopUpdatingLocation();

        [DllImport("__Internal")] static extern bool _ISN_CL_PausesLocationUpdatesAutomatically();
        [DllImport("__Internal")] static extern void _ISN_CL_SetPausesLocationUpdatesAutomatically(bool value);

        [DllImport("__Internal")] static extern bool _ISN_CL_AllowsBackgroundLocationUpdates();
        [DllImport("__Internal")] static extern void _ISN_CL_SetAllowsBackgroundLocationUpdates(bool value);

        [DllImport("__Internal")] static extern void _ISN_CL_SetDesiredAccuracy(int value);

        [DllImport("__Internal")] static extern void _ISN_CL_SetDistanceFilter(double value);
        [DllImport("__Internal")] static extern double _ISN_CL_GetDistanceFilter();

        [DllImport("__Internal")] static extern double _ISN_CL_Cllocation_DistanceFromLocation(string location1, string location2);
#endif

        public static bool LocationServicesEnabled()
        {
#if API_ENABLED
            return _ISN_CL_LocationServicesEnabled();
#else
            return false;
#endif
        }

        public static void RequestAlwaysAuthorization()
        {
#if API_ENABLED
            _ISN_CL_RequestAlwaysAuthorization();
#endif
        }

        public static void RequestWhenInUseAuthorization()
        {
#if API_ENABLED
            _ISN_CL_RequestWhenInUseAuthorization();
#endif
        }

        public static void RequestLocation()
        {
#if API_ENABLED
            _ISN_CL_RequestLocation();
#endif
        }

        public static void StartUpdatingLocation()
        {
#if API_ENABLED
            _ISN_CL_StartUpdatingLocation();
#endif
        }

        public static void StopUpdatingLocation()
        {
#if API_ENABLED
            _ISN_CL_StopUpdatingLocation();
#endif
        }

        public static void SetDesiredAccuracy(ISN_CLLocationAccuracy value)
        {
#if API_ENABLED
            _ISN_CL_SetDesiredAccuracy((int) value);
#endif
        }

        public static void SetDelegate(ISN_ICLLocationManagerDelegate @delegate)
        {
#if API_ENABLED
            _ISN_CL_SetDelegate(
                ISN_MonoPCallback.ActionToIntPtr<int>(result =>
                {
                    var auth = (ISN_CLAuthorizationStatus) result;
                    @delegate.DidChangeAuthorizationStatus(auth);
                }),
                ISN_MonoPCallback.ActionToIntPtr<ISN_CLLocationArray>(result =>
                {
                    @delegate.DidUpdateLocations(result);
                }),
                ISN_MonoPCallback.ActionToIntPtr<SA_Error>(result =>
                {
                    @delegate.DidFailWithError(result);
                }),
                ISN_MonoPCallback.ActionToIntPtr<SA_Error>(result =>
                {
                    @delegate.DidFinishDeferredUpdatesWithError(result);
                }),
                ISN_MonoPCallback.ActionToIntPtr<int>(result =>
                {
                    @delegate.DidPauseLocationUpdates();
                }),
                ISN_MonoPCallback.ActionToIntPtr<int>(result =>
                {
                    @delegate.DidResumeLocationUpdates();
                })
            );
#endif
        }

        public static bool PausesLocationUpdatesAutomatically
        {
            get
            {
#if API_ENABLED
                return _ISN_CL_PausesLocationUpdatesAutomatically();
#else
                return false;
#endif
            }

            set
            {
#if API_ENABLED
                _ISN_CL_SetPausesLocationUpdatesAutomatically(value);
#endif
            }
        }

        public static double DistanceFilter
        {
            get
            {
#if API_ENABLED
                return _ISN_CL_GetDistanceFilter();
#else
                return 0;
#endif
            }

            set
            {
#if API_ENABLED
                _ISN_CL_SetDistanceFilter(value);
#endif
            }
        }

        public static bool AllowsBackgroundLocationUpdates
        {
            get
            {
#if API_ENABLED
                return _ISN_CL_AllowsBackgroundLocationUpdates();
#else
                return false;
#endif
            }

            set
            {
#if API_ENABLED
                _ISN_CL_SetAllowsBackgroundLocationUpdates(value);
#endif
            }
        }

        public static ISN_CLAuthorizationStatus AuthorizationStatus
        {
            get
            {
#if API_ENABLED
                return (ISN_CLAuthorizationStatus) _ISN_CL_AuthorizationStatus();
#else
                return ISN_CLAuthorizationStatus.NotDetermined;
#endif
            }
        }

        public static double CllocationDistanceFromLocation(ISN_CLLocation location1, ISN_CLLocation location2)
        {
#if API_ENABLED
            return _ISN_CL_Cllocation_DistanceFromLocation(JsonUtility.ToJson(location1), JsonUtility.ToJson(location2));
#else
            return 0;
#endif
        }
    }
}
