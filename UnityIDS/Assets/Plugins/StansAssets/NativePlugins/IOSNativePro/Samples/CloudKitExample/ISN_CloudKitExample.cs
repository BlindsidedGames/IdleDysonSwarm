using System;
using UnityEngine;
using UnityEngine.UI;
using SA.iOS.CloudKit;

public class ISN_CloudKitExample : MonoBehaviour
{
    ISN_CloudKitContainer.AccountStatusDelegate OnAccountStatusChanged;

    // This texture we use as data source for our record.
    public Texture2D texture;

    public Texture2D texture2;

    public Text text;

    ISN_CKRecordID recordID;

    bool isReady = true;

    void Start()
    {
        GetAccountStatus();
        var container = new ISN_CloudKitContainer();
        OnAccountStatusChanged += AccountStatusChanged;
        container.InitAccoutStatusNotificationCallback(OnAccountStatusChanged);
    }

    void Update()
    {
        if (Application.platform == RuntimePlatform.tvOS)
        {
            if (!isReady)
            {
                return;
            }

            if (Input.GetAxisRaw("Vertical") > 0.4)
            {
                SaveRecord();
            }
            else if (Input.GetAxisRaw("Vertical") < 0.4 && Input.GetAxisRaw("Vertical") > -0.15)
            {
                FetchRecord();
            }
            else if (Input.GetAxisRaw("Vertical") < -0.2)
            {
                RemoveRecord();
            }
        }
    }

    /// Here we get account status from container.
    public void GetAccountStatus()
    {
        isReady = false;
        var container = new ISN_CloudKitContainer();
        container.GetAccountStatus(callback =>
        {
            if (callback.State == ISN_CKResultType.Success)
            {
                text.text = $"We get account status - {callback.AccountState.ToString()}";
            }
            else
            {
                text.text = $"We have an error at getting account status - {callback.Description}";
            }

            isReady = true;
        });
    }

    // Account status changed event.
    public void AccountStatusChanged()
    {
        Debug.Log("Accoutn status changed");
    }

    /// Here we create and then save record to CloudKit.
    public void SaveRecord()
    {
        isReady = false;
        var date = DateTime.Now;

        // First we need to set database that we want to use.
        var database = new ISN_CloudKitContainer().Private;

        // Then we create recordID.
        var recordID = new ISN_CKRecordID("Name - " + date.Millisecond);

        // After this we create record and set up all fields that we want.
        var record = new ISN_CKRecord("TestType", recordID);
        record.AddField("name", "Record Name - " + date.Second.ToString());
        record.AddField("date", date);
        record.AddField("image", texture.EncodeToPNG());
        record.AddField("image2", texture2.EncodeToPNG());

        // Then we save this record to chosen database.
        database.SaveRecord(record, callback =>
        {
            if (callback.State == ISN_CKResultType.Success)
            {
                this.recordID = recordID;
                var savedRecord = callback.Record;
                if (savedRecord != null)
                {
                    text.text = $"We saved this - {savedRecord.RecordID.RecordName} record to DB";
                }
                else
                {
                    text.text = $"We saved this - {recordID.RecordName} record to DB";
                }
            }
            else if (callback.State == ISN_CKResultType.Error)
            {
                text.text = $"We have an error at saving this - {recordID.RecordName} record, error - {callback.Description}";
            }

            isReady = true;
        });
    }

    /// This is an example of how to fetch record from CloudKit.
    public void FetchRecord()
    {
        isReady = false;

        // You need to have recordID to fetch some record.
        // Here we try to fetch record that we just save, but you can create new recordID and fetch it.
        if (this.recordID != null)
        {
            var database = new ISN_CloudKitContainer().Private;
            database.FetchRecordWithID(recordID, callback =>
            {
                if (callback.State == ISN_CKResultType.Success)
                {
                    string textString = $"We fetched this record - {recordID.RecordName}.\n";

                    // Record that was fetched you can get from callback result like this below.
                    textString += $"Name field is - {callback.Record.GetStringValue("name")}.\n";
                    textString += $"Record change tag is - {callback.Record.RecordChangeTag}.\n";
                    textString += $"Date and time field  is - {callback.Record.GetDateTimeValue("date")}.\n";
                    var data = callback.Record.GetDataValue("image");
                    textString += $"We fetched data field, amount of bytes is - {data.Length}.\n";
                    text.text = textString;
                }
                else
                {
                    text.text = $"We have an error at fetching this - {recordID.RecordName} record, error - {callback.Description}";
                }

                isReady = true;
            });
        }
        else
        {
            text.text = "We don't have RecordID to fetch, please save some record and then try to fetch one more time.";
        }
    }

    /// This is an example of how to remove record from CloudKit.
    public void RemoveRecord()
    {
        isReady = false;

        // As like for fetching you need to have recordID to remove the record.
        // Here we try to remove record that we just save, but you can create new recordID and then remove it.
        if (this.recordID != null)
        {
            var database = new ISN_CloudKitContainer().Private;
            database.RemoveRecordByID(recordID, callback =>
            {
                if (callback.State == SA.iOS.CloudKit.ISN_CKResultType.Success)
                {
                    text.text = $"We removed this record {recordID.RecordName} from DB";
                }
                else if (callback.State == SA.iOS.CloudKit.ISN_CKResultType.Error)
                {
                    text.text = $"We have an error at removing record {callback.Description}";
                }

                isReady = true;
            });
        }
        else
        {
            text.text = "We don't have RecordID to remove, please save some record and then try to fetch one more time.";
        }
    }

    /// This is an example of how to update record for CloudKit.
    public void UpdateRecord()
    {
        isReady = false;

        // You need to have recordID to update some record.
        // Here we try to fetch record that we just save,
        // but you can create new recordID and fetch it so then we would be able to update fetched record.
        if (this.recordID != null)
        {
            var database = new ISN_CloudKitContainer().Private;
            database.FetchRecordWithID(recordID, callback =>
            {
                if (callback.State == ISN_CKResultType.Success)
                {
                    string textString = $"We fetched this record - {recordID.RecordName}.\n";

                    // Next we will update this record data.
                    var record = callback.Record;
                    record.UpdateField("date", DateTime.Now.AddHours(1));
                    record.UpdateField("image", texture2.EncodeToPNG());
                    record.UpdateField("image2", texture.EncodeToPNG());

                    // And now we will update this record in iCloud
                    database.UpdateRecord(record, ISN_CKRecordSavePolicy.CKRecordSaveIfServerRecordUnchanged, updateCallback =>
                    {
                        if (updateCallback.State == ISN_CKResultType.Success)
                        {
                            var savedRecord = updateCallback.Record;
                            if (savedRecord != null)
                            {
                                text.text = $"We updated this - {savedRecord.RecordID.RecordName} record to DB";
                            }
                            else
                            {
                                text.text = $"We updated this - {recordID.RecordName} record to DB";
                            }
                        }
                        else
                        {
                            text.text = $"We have an error at updating this - {recordID.RecordName} record, error code - {updateCallback.ErrorCode}, error - {updateCallback.Description}";
                        }
                    });
                }
                else
                {
                    text.text = $"We have an error at fetching this - {recordID.RecordName} record for updating, error - {callback.Description}";
                }

                isReady = true;
            });
        }
        else
        {
            text.text = "We don't have RecordID to update, please save some record and then try to update it one more time.";
        }
    }
}
