using System;
using UnityEngine;
using StansAssets.Foundation;

namespace SA.iOS.CloudKit
{
    /// <summary>
    /// This is field of a record.
    /// It saves and give access to key, type or value of this field.
    /// </summary>
    [Serializable]
    public class ISN_CKRecordField
    {
        [SerializeField]
        public string m_Key;

        [SerializeField]
        public string m_Value;

        byte[] m_data;

        [SerializeField]
        public string m_Type;

        ISN_CKRecordFieldType m_fieldType;

        /// <summary>
        /// Get key of this record field.
        /// </summary>
        public string Key => m_Key;

        /// <summary>
        /// Type of value of this field.
        /// </summary>
        public ISN_CKRecordFieldType Type => m_fieldType;

        /// <summary>
        /// Return string value of this field.
        /// </summary>
        public string StringValue => m_Value;

        /// <summary>
        /// Return int value of this field.
        /// </summary>
        public int IntValue {
            get => int.Parse(m_Value);
            set => m_Value = value.ToString();
        } 

        /// <summary>
        /// Return DataTime value of this field.
        /// </summary>
        public DateTime DateValue => DateTime.ParseExact(m_Value, "dd-MM-yyyy-HH:mm:ss", null);


        /// <summary>
        /// Return CKAsset value of this field.
        /// </summary>
        public ISN_CKAsset CKAssetValue => new ISN_CKAsset(m_Value);

        /// <summary>
        /// Return data value of this field as byte array.
        /// </summary>
        public byte[] DataValue {
            get {
                if (m_data == null) {
                    m_data = Internal.ISN_CloudKitLib.Api.GetRecordFieldByteData(m_Value);
                }
                return m_data;
            }
        }

        /// <summary>
        /// Creation of CKRecord field.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> Value of this field. </param>
        /// <param name="type"> Type of this field. </param>
        public ISN_CKRecordField(string key, string value, ISN_CKRecordFieldType type) {
            this.m_Key = key;
            this.m_Value = value;
            this.m_Type = type.ToString();
            this.m_fieldType = type;
            if (type == ISN_CKRecordFieldType.Data) {
                m_data = Internal.ISN_CloudKitLib.Api.GetRecordFieldByteData(m_Value);
            }
        }

        /// <summary>
        /// Creation of CKRecord field.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> Value of this field. Here we set index for pointer for this data. </param>
        /// <param name="data"> This is byte array with data for this field. </param>
        /// <param name="type"> Type of this field. </param>
        public ISN_CKRecordField(string key, int value, byte[] data, ISN_CKRecordFieldType type) {
            this.m_Key = key;
            this.m_Value = value.ToString();
            this.m_data = data;
            this.m_Type = type.ToString();
            this.m_fieldType = type;
        }

        /// <summary>
        /// Here we reset this field. 
        /// We need to do it in order to properly set the field that we get from iCloud before we can update it.
        public void Reset() {
            if (m_Type.Equals(ISN_CKRecordFieldType.Data.ToString()) && m_data == null) {
                m_data = Internal.ISN_CloudKitLib.Api.GetRecordFieldByteData(m_Value);
                m_fieldType = ISN_CKRecordFieldType.Data;
                this.m_Value = "";
            }
        }
    }
}
