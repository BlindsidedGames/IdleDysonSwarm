////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using UnityEngine;
using StansAssets.Foundation;

namespace SA.iOS.Foundation
{
    /// <summary>
    /// The Key Value Object record representation.
    /// </summary>
    [Serializable]
    public class ISN_NSKeyValueObject
    {
        [SerializeField]
        string m_Key;
        [SerializeField]
        string m_Value;

        internal ISN_NSKeyValueObject(string key, string value)
        {
            m_Key = key;
            m_Value = value;
        }

        /// <summary>
        /// Gets or sets the key of the Pair.
        /// </summary>
        public string Key => m_Key;

        /// <summary>
        /// Returns string representation of the value.
        /// </summary>
        public string StringValue => m_Value;

        /// <summary>
        /// Returns int representation of the value.
        /// </summary>
        public int IntValue => Convert.ToInt32(m_Value);

        /// <summary>
        /// Returns bool representation of the value.
        /// </summary>
        public bool BoolValue => Convert.ToBoolean(m_Value);

        /// <summary>
        /// Returns float representation of the value.
        /// </summary>
        public float FloatValue => Convert.ToSingle(m_Value);

        /// <summary>
        /// Returns long representation of the value.
        /// </summary>
        public long LongValue => Convert.ToInt64(m_Value);

        /// <summary>
        /// Returns ulong representation of the value.
        /// </summary>
        public ulong ULongValue => Convert.ToUInt64(m_Value);

        /// <summary>
        /// Returns Bytes array representation of the value.
        /// </summary>
        public byte[] BytesArrayValue => Convert.FromBase64String(m_Value);

        /// <summary>
        /// Returns DateTime representation of the value.
        /// </summary>
        public DateTime DateTimeValue => TimeUtility.FromUnixTime(LongValue);

        /// <summary>
        /// Create an object from its JSON representation. Internally, this method uses the Unity serializer;
        /// therefore the type you are creating must be supported by the serializer.
        /// It must be a plain class/struct marked with the Serializable attribute.Fields of the object must have types supported by the serializer.
        /// Fields that have unsupported types, as well as private fields or fields marked with the NonSerialized attribute, will be ignored.
        /// </summary>
        public T GetObject<T>()
        {
            return JsonUtility.FromJson<T>(m_Value);
        }
    }
}
