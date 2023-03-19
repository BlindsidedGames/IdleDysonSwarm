#if (UNITY_IPHONE || UNITY_TVOS)
#define API_ENABLED
#endif

using System;
using UnityEngine;
#if API_ENABLED
using System.Runtime.InteropServices;

#endif

namespace SA.iOS.Utilities
{
    /// <summary>
    /// The class holds link to the native object created on Objective-C side.
    ///
    /// When you done using the object, it's important to call <see cref="Dispose"/> method.
    /// Otherwise Object on java native side will remain with strong link, and will not be collected by GC.
    /// </summary>
    [Serializable]
    public class ISN_NativeObject : IDisposable
    {
#if API_ENABLED
        [DllImport("__Internal")]
        static extern void _ISN_HashStorage_Dispose(ulong key);
#endif

        internal const ulong NullObjectHash = 0;

        [SerializeField]
        ulong m_NativeHashCode;

        public ISN_NativeObject() { }

        public ISN_NativeObject(ulong hasCode)
        {
            SetNativeHashCode(hasCode);
        }

        internal void SetNativeHashCode(ulong hasCode)
        {
            m_NativeHashCode = hasCode;
        }

        /// <summary>
        /// The object hash code, matched with java object hash on native side.
        /// </summary>
        public ulong NativeHashCode
        {
            get => m_NativeHashCode;
            protected set => m_NativeHashCode = value;
        }

        /// <summary>
        /// Returns true in case native object is null.
        /// </summary>
        public bool IsNull => m_NativeHashCode.Equals(NullObjectHash);

        /// <summary>
        /// Will free native object hard link.
        /// </summary>
        public void Dispose()
        {
#if API_ENABLED
            _ISN_HashStorage_Dispose(m_NativeHashCode);
#endif
        }
    }
}
