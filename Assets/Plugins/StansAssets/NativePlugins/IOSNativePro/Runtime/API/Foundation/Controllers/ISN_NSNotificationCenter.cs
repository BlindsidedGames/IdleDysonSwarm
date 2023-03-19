using System;
using System.Collections.Generic;
using UnityEngine;
using SA.iOS.Utilities;
#if UNITY_IPHONE || UNITY_TVOS
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.Foundation
{
    /// <summary>
    /// A container for information broadcast through a notification center to all registered observers.
    /// https://developer.apple.com/documentation/foundation/nsnotificationcenter?language=objc
    /// </summary>
    public class ISN_NSNotificationCenter
    {
#if UNITY_IPHONE || UNITY_TVOS
        [DllImport("__Internal")]
        static extern void _ISN_NSNotificationCenter_AddObserverForName(string name, IntPtr callback);
#endif

        static ISN_NSNotificationCenter s_DefaultCenter;

        /// <summary>
        /// Adds an entry to the notification center's dispatch table that includes a notification queue
        /// and a block to add to the queue, and an optional notification name.
        /// </summary>
        /// <param name="name">
        /// The name of the notification for which to register the observer;
        /// that is, only notifications with this name are used to add the block to the operation queue.
        /// </param>
        /// <param name="callback">The block to be executed when the notification is received.</param>
        public void AddObserverForName(string name, Action<ISN_NSNotification> callback)
        {
            if (Application.isEditor)
                return;

#if UNITY_IPHONE || UNITY_TVOS
            _ISN_NSNotificationCenter_AddObserverForName(name, ISN_MonoPCallback.ActionToIntPtr(callback));
#endif
        }

        /// <summary>
        /// The app’s default notification center.
        ///
        /// All system notifications sent to an app are posted to the defaultCenter notification center.
        /// You can also post your own notifications there.
        ///
        /// If your app uses notifications extensively,
        /// you may want to create and post to your own notification centers rather than posting
        /// only to the defaultCenter notification center.
        /// When a notification is posted to a notification center,
        /// the notification center scans through the list of registered observers,
        /// which may slow down your app. By organizing notifications functionally around one or more notification centers,
        /// less work is done each time a notification is posted, which can improve performance throughout your app.
        /// </summary>
        public static ISN_NSNotificationCenter DefaultCenter => s_DefaultCenter ?? (s_DefaultCenter = new ISN_NSNotificationCenter());
    }
}
