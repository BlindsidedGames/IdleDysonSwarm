using System;
using UnityEngine;
using System.Collections.Generic;
using System.Runtime.InteropServices;

namespace SA.iOS.CloudKit 
{
    /// <summary>
    /// An object of key-value pairs that you use to fetch and save your app's data.
    /// Records are the fundamental objects you use to manage data in CloudKit.
    /// You may define any number of record types for your app, with each record type corresponding to a different type of information you need.
    // Within a given record type, you then define one or more fields, each of which has a name and a data value.
    /// </summary>
    [Serializable]
    public class ISN_CKRecord
    {
        [SerializeField]
        public string m_RecordType;

        [SerializeField]
        public string m_RecordName;

        [SerializeField]
        public string m_ZoneName;

        [SerializeField]
        public string m_OwnerName;

        [SerializeField]
        public string m_RecordChangeTag;

        [SerializeField]
        public List<ISN_CKRecordField> m_Fields;

        int m_dataElementsAmout = 0;

        ISN_CKRecordID m_recordID;

        List<IntPtr> m_pointers;

        List<int> m_sizeOfData;

        /// <summary>
        /// Get recordType of this record
        /// </summary>
        public string RecordType => m_RecordType;

        /// <summary>
        /// Get recordChangeTag of this record
        /// </summary>
        public string RecordChangeTag => m_RecordChangeTag;

        /// <summary>
        /// Get recordID of this record.
        /// </summary>
        public ISN_CKRecordID RecordID {
            get {
                if (this.m_recordID == null) {
                    var zoneID = new ISN_CKZoneID(this.m_ZoneName, this.m_OwnerName);
                    this.m_recordID = new ISN_CKRecordID(this.m_RecordName, zoneID);
                }
                return this.m_recordID;
            }
        }

        /// <summary>
        /// Get record fields.
        /// <summary>
        public List<ISN_CKRecordField> Fields => m_Fields;

        /// <summary>
        /// Get amount off data elements in this record.
        /// </summary>
        public int DataElementsAmount => m_dataElementsAmout;

        /// <summary>
        /// Get array of pointers to data objects of this record.
        /// </summary>
        public List<IntPtr> Pointers {
            get {
                int amount = m_dataElementsAmout;
                if (m_pointers == null) {
                    amount = 0;
                    m_pointers = new List<IntPtr>();
                    m_sizeOfData = new List<int>();
                    foreach(ISN_CKRecordField field in this.m_Fields) {
                        if (field.Type == ISN_CKRecordFieldType.Data) {
                            IntPtr pointer = Marshal.AllocHGlobal(field.DataValue.Length);
                            Marshal.Copy(field.DataValue, 0, pointer, field.DataValue.Length);
                            m_pointers.Add(pointer);
                            m_sizeOfData.Add(field.DataValue.Length);
                            field.IntValue = amount;
                            amount += 1;
                        }
                    }
                }
                this.m_dataElementsAmout = amount;
                return m_pointers;
            }
            set => m_pointers = value;
        }

        /// <summary>
        /// Get amount of buffer sizes for data fields that you have in this record.
        /// </summary>
        public List<int> DataBufferSize {
            get {
                if (m_sizeOfData == null) {
                    var data = Pointers;
                }
                return m_sizeOfData;
            }
        }

        /// <summary>
        /// Initializes and returns a record using an ID that you provide.
        /// <summary>
        /// <param name"recordType"> 
        /// A string reflecting the type of record that you want to create. 
        /// Define the record types that your app supports, and use them to distinguish between records with different types of data.
        /// This parameter must not be nil or contain an empty string.
        /// Record type names consist of one or more alphanumeric characters and start with a letter.
        /// Type names may include underscore characters if they do not start with that character.
        /// Spaces are not allowed in record type names.
        /// </param>
        /// <param name="recordID">
        /// The ID to assign to the record itself.
        /// When creating the ID, you can specify the zone in which to place the record.
        /// The ID cannot currently be in use by any other record and must not be nil.
        /// </param>
        public ISN_CKRecord(string recordType, ISN_CKRecordID recordID) {
            this.m_recordID = recordID;
            this.m_RecordType = recordType;
            this.m_RecordName = recordID.RecordName;
            this.m_ZoneName = recordID.ZoneID.ZoneName;
            this.m_OwnerName = recordID.ZoneID.OwnerName;
            this.m_Fields = new List<ISN_CKRecordField>();
        }

        /// Add fields methods.

        /// <summary>
        /// Method for adding field to the record.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> Int value for this field. </param>
        public void AddField(string key, int value) {
            var field = new ISN_CKRecordField(key, value.ToString(), ISN_CKRecordFieldType.Number);
            this.m_Fields.Add(field);
        }

        /// <summary>
        /// Method for adding field to the record.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> String value for this field. </param>
        public void AddField(string key, string value) {
            var field = new ISN_CKRecordField(key, value, ISN_CKRecordFieldType.String);
            this.m_Fields.Add(field);
        }

        /// <summary>
        /// Method for adding field to the record.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> Date value for this field. </param>
        public void AddField(string key, DateTime value) {
            var m_value = value.ToString("dd-MM-yyyy-HH:mm:ss");
            var field = new ISN_CKRecordField(key, m_value, ISN_CKRecordFieldType.Date);
            this.m_Fields.Add(field);
        }

        /// <summary>
        /// Method for adding field to the record.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> CKAsset value for this field. </param>
        public void AddField(string key, ISN_CKAsset value) {
            var field = new ISN_CKRecordField(key, value.AssetURL, ISN_CKRecordFieldType.Asset);
            this.m_Fields.Add(field);
        }

        /// <summary>
        /// Method for adding field to the record.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> byte array as value for this field. </param>
        public void AddField(string key, byte[] value) {
            var field = new ISN_CKRecordField(key, this.m_dataElementsAmout, value, ISN_CKRecordFieldType.Data);
            this.m_Fields.Add(field);
            this.m_dataElementsAmout += 1;
        }

        /// Get field methods.

        /// <summary>
        /// Method for getting int value for given key.
        /// If we don't have value for given key, this method will return 0.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        public int GetIntValue(string key) {
            foreach(ISN_CKRecordField field in this.Fields) {
                if (field.Key.Equals(key)) {
                    return field.IntValue;
                }
            }
            return 0;
        }

        /// <summary>
        /// Method for getting string value for given key.
        /// If we don't have value for given key, this method will return empty string.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        public string GetStringValue(string key) {
            foreach(ISN_CKRecordField field in this.Fields) {
                if (field.Key.Equals(key)) {
                    return field.StringValue;
                }
            }
            return string.Empty;
        }
        
        /// <summary>
        /// Method for getting DataTime value for given key.
        /// If we don't have value for given key, this method will return DateTime.Now.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        public DateTime GetDateTimeValue(string key) {
            foreach(ISN_CKRecordField field in this.Fields) {
                if (field.Key.Equals(key)) {
                    return field.DateValue;
                }
            }
            return DateTime.Now;
        }

        /// <summary>
        /// Method for getting data value for given key.
        /// If we don't have value for given key, this method will return empty byte array.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        public byte[] GetDataValue(string key) {
            foreach(ISN_CKRecordField field in this.Fields) {
                if (field.Key.Equals(key)) {
                    return field.DataValue;
                }
            }
            return new byte[0];
        }

        /// <summary>
        /// Method for getting CKAsset value for given key.
        /// If we don't have value for given key, this method will return null.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        public ISN_CKAsset GetAssetValue(string key) {
            foreach(ISN_CKRecordField field in this.Fields) {
                if (field.Key.Equals(key)) {
                    return field.CKAssetValue;
                }
            }
            return null;
        }

        private bool RemoveField(string key) {
            foreach(ISN_CKRecordField field in this.Fields) {
                if(field.Key.Equals(key)) {
                    this.m_Fields.Remove(field);
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// Method for updaating field of the record.
        /// If we don't have this field in this redord, this method will return false.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> byte array as value for this field. </param>
        public bool UpdateField(string key, byte[] value) {
            if (RemoveField(key)) {
                var field = new ISN_CKRecordField(key, 0, value, ISN_CKRecordFieldType.Data);
                this.m_Fields.Add(field);
                return true;
            }
            return false;
        }

        /// <summary>
        /// Method for updaating field of the record.
        /// If we don't have this field in this redord, this method will return false.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> string value for this field. </param>
        public bool UpdateField(string key, string value) {
            if (RemoveField(key)) {
                var field = new ISN_CKRecordField(key, value, ISN_CKRecordFieldType.String);
                this.m_Fields.Add(field);
                return true;
            }
            return false;
        }

        /// <summary>
        /// Method for updaating field of the record.
        /// If we don't have this field in this redord, this method will return false.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> int value for this field. </param>
        public bool UpdateField(string key, int value) {
            if (RemoveField(key)) {
                var field = new ISN_CKRecordField(key, value.ToString(), ISN_CKRecordFieldType.Number);
                this.m_Fields.Add(field);
                return true;
            }
            return false;
        }

        /// <summary>
        /// Method for updaating field of the record.
        /// If we don't have this field in this redord, this method will return false.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> DateTime value for this field. </param>
        public bool UpdateField(string key, DateTime value) {
            if (RemoveField(key)) {
                var m_value = value.ToString("dd-MM-yyyy-HH:mm:ss");
                var field = new ISN_CKRecordField(key, m_value, ISN_CKRecordFieldType.Date);
                this.m_Fields.Add(field);
                return true;
            }
            return false;
        }

        /// <summary>
        /// Method for updaating field of the record.
        /// If we don't have this field in this redord, this method will return false.
        /// </summary>
        /// <param name="key"> Key for this field. </param>
        /// <param name="value"> DateTime value for this field. </param>
        public bool UpdateField(string key, ISN_CKAsset value) {
            if (RemoveField(key)) {
                var field = new ISN_CKRecordField(key, value.AssetURL, ISN_CKRecordFieldType.Asset);
                this.m_Fields.Add(field);
                return true;
            }
            return false;
        }


        /// <summary>
        /// Reset this record after we get it from iCloud.
        /// We need to do it in order to be able update it in iCloud.
        /// </summary>
        public void Reset() {
            this.m_pointers = null;
            this.m_sizeOfData = null;
            this.m_dataElementsAmout = 0;
            foreach(ISN_CKRecordField field in this.Fields) {
                field.Reset();
            }
        }
    }
}
