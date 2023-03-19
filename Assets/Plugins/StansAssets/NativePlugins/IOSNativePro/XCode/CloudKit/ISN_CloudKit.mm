//
//  ISN_ICloud.m
//  Unity-iPhone
//
//  Created by Roman on 16.08.2020.
//

#import "ISN_CKCommunication.h"

@interface ISN_CloudKit : NSObject
@end

@implementation ISN_CloudKit
- (id) getFieldValueFrom:(ISN_CKRecordField *)field dataArray:(NSMutableArray<NSData *> *)data {
    if ([field.m_Type isEqualToString:stringFieldType]) {
        return field.m_Value;
    } else if ([field.m_Type isEqualToString:numberFieldType]) {
        return [[NSNumber alloc] initWithInteger:[field.m_Value integerValue]];
    } else if ([field.m_Type isEqualToString:assetFieldType]) {
        NSURL *url = [[NSURL alloc] initWithString:field.m_Value];
        CKAsset *asset = [[CKAsset alloc] initWithFileURL:url];
        return asset;
    } else if ([field.m_Type isEqualToString:dateFieldType]) {
        NSDateFormatter * dateFormatter = [[NSDateFormatter alloc]init];
        [dateFormatter setDateFormat:dateFormat];
        NSDate *date = [dateFormatter dateFromString:field.m_Value];
        return date;
    } else if ([field.m_Type isEqualToString:dataFieldType]) {
        return [data objectAtIndex:[field.m_Value integerValue]];
    }
    return nil;
}

- (CKDatabase *)parsDataBaseTypeFrom:(NSString *)string {
    if ([string isEqualToString:@"Shared"]) {
        return [[CKContainer defaultContainer] sharedCloudDatabase];
    } else if ([string isEqualToString:@"Public"]) {
        return [[CKContainer defaultContainer] publicCloudDatabase];
    } else {
        return [[CKContainer defaultContainer] privateCloudDatabase];
    }
}

- (void) setRecord:(CKRecord *)record withRecordData:(ISN_CloudKitRecord *)recordData withData:(NSMutableArray<NSData *> *)data {
    for (id stringField in recordData.m_Fields) {
        NSData * jsonData = [NSJSONSerialization  dataWithJSONObject:stringField options:0 error:nil];
        NSString *myString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
        ISN_CKRecordField *field = [[ISN_CKRecordField alloc] initWithString:myString error:nil];
        record[field.m_Key] = [self getFieldValueFrom:field dataArray:data];
    }
}

- (CKRecordID *)createRecordIDFrom:(ISN_CloudKitRecord *)record {
    if (![record.m_ZoneName isEqualToString:@"defaultZone"]) {
        CKRecordZoneID *zoneID = [[CKRecordZoneID alloc] initWithZoneName:record.m_ZoneName ownerName:record.m_OwnerName];
        CKRecordID *recordID = [[CKRecordID alloc] initWithRecordName:record.m_RecordName zoneID:zoneID];
        return recordID;
    }
    return [[CKRecordID alloc] initWithRecordName:record.m_RecordName zoneID: [CKRecordZone.defaultRecordZone zoneID]];
}

- (ISN_CloudKitRecord *)parseRecordFrom:(CKRecord *)record  withName:(NSString *)name{
    ISN_CloudKitRecord *m_record = [[ISN_CloudKitRecord alloc] init];
    NSURL *tmpDirURL = [NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES];
    m_record.m_RecordName = name;
    m_record.m_RecordType = record.recordType;
    if ([[record.recordID zoneID] isEqual:[CKRecordZone.defaultRecordZone zoneID]]) {
        m_record.m_ZoneName = @"defaultZone";
        m_record.m_OwnerName = @"";
    } else {
        m_record.m_ZoneName = [record.recordID zoneID].zoneName;
        m_record.m_OwnerName = [record.recordID zoneID].ownerName;
    }
    m_record.m_Fields = [[NSMutableArray alloc] init];
    m_record.m_RecordChangeTag = record.recordChangeTag;
    for (CKRecordFieldKey key in [record allKeys]) {
        ISN_CKRecordField *field = [[ISN_CKRecordField alloc] init];
        field.m_Key = key;
        if ([record[key] isKindOfClass:NSNumber.class]) {
            field.m_Type = numberFieldType;
            field.m_Value = [(NSNumber *)record[key] stringValue];
        } else if([record[key] isKindOfClass:NSString.class]) {
            field.m_Type = stringFieldType;
            field.m_Value = record[key];
        } else if([record[key] isKindOfClass:NSDate.class]) {
            field.m_Type = dateFieldType;
            NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
            [formatter setDateFormat:dateFormat];
            field.m_Value = [formatter stringFromDate:(NSDate *)record[key]];
        } else if([record[key] isKindOfClass:CKAsset.class]) {
            field.m_Type = assetFieldType;
            field.m_Value = [[(CKAsset *)record[key] fileURL] absoluteString];
        } else if([record[key] isKindOfClass:NSData.class]) {
            field.m_Type = dataFieldType;
            NSURL *fileURL = [[tmpDirURL URLByAppendingPathComponent:key] URLByAppendingPathExtension:@"data"];
            NSData *data = (NSData *)record[key];
            if ([data writeToFile:[fileURL path] atomically:YES]) {
                field.m_Value = key;
            } else {
                field.m_Value = errorResponseState;
            }
            
        }
        [m_record.m_Fields addObject:[field toDictionary]];
    }
    return m_record;
}

- (void)saveRecordWith:(ISN_CloudKitRecord *)recordData databaseType:(NSString *)type dataArray:(NSMutableArray<NSData *> *)data {
    CKDatabase *database = [self parsDataBaseTypeFrom:type];
    CKRecordID *recordID = [self createRecordIDFrom:recordData];
    CKRecord *record = [[CKRecord alloc] initWithRecordType:recordData.m_RecordType recordID:recordID];
    [self setRecord:record withRecordData:recordData withData:data];
    [database saveRecord:record completionHandler:^(CKRecord * _Nullable record, NSError * _Nullable error) {
        ISN_CloudKitResponse *response = [[ISN_CloudKitResponse alloc] init];
        if (error) {
            response.m_State = errorResponseState;
            response.m_Description = error.description;
        } else {
            response.m_State = successResponseState;
            response.m_Description = @"";
            response.m_Record = [self parseRecordFrom:record withName:recordData.m_RecordName];
        }
        ISN_SendCallbackToUnity(CloudKitCallback, [response toJSONString]);
    }];
}

- (void)removeRecordByName:(NSString *)name databaseType:(NSString *)type {
    CKDatabase *database = [self parsDataBaseTypeFrom:type];
    CKRecordID *recordID = [[CKRecordID alloc] initWithRecordName:name];
    [database deleteRecordWithID:recordID completionHandler:^(CKRecordID * _Nullable recordID, NSError * _Nullable error) {
        ISN_CloudKitResponse *response = [[ISN_CloudKitResponse alloc] init];
        if (error) {
            response.m_State = errorResponseState;
            response.m_Description = error.description;
        } else {
            response.m_State = successResponseState;
            response.m_Description = @"";
        }
        ISN_SendCallbackToUnity(CloudKitCallback, [response toJSONString]);
    }];
}

- (void)fetchRecordByName:(NSString *)name databaseType:(NSString *)type {
    CKDatabase *database = [self parsDataBaseTypeFrom:type];
    CKRecordID *recordID = [[CKRecordID alloc] initWithRecordName:name];
    [database fetchRecordWithID:recordID completionHandler:^(CKRecord * _Nullable record, NSError * _Nullable error) {
        ISN_CloudKitResponse *response = [[ISN_CloudKitResponse alloc] init];
        if (error) {
            response.m_State = errorResponseState;
            response.m_Description = error.description;
        } else {
            response.m_State = successResponseState;
            response.m_Record = [self parseRecordFrom:record withName:name];
        }
        ISN_SendCallbackToUnity(CloudKitCallback, [response toJSONString]);
    }];
}

- (CKModifyRecordsOperation *)createUpdateOperationFor:(CKRecord *)record withRecordData:(ISN_CloudKitRecord *)recordData withData:(NSMutableArray<NSData *> *)data savePolicy:(int)policy {
    [self setRecord:record withRecordData:recordData withData:data];
    CKModifyRecordsOperation *operation = [[CKModifyRecordsOperation alloc] initWithRecordsToSave:@[record] recordIDsToDelete:nil];
    operation.savePolicy = SavePolicy[policy];
    operation.qualityOfService=NSQualityOfServiceUserInitiated;
    operation.modifyRecordsCompletionBlock= ^(NSArray * savedRecords, NSArray * deletedRecordIDs, NSError * error){
        ISN_CloudKitResponse *response = [[ISN_CloudKitResponse alloc] init];
        if (error) {
            response.m_State = errorResponseState;
            response.m_Description = error.description;
            response.m_ErrorCode = (int)error.code;
        } else {
            response.m_State = successResponseState;
            response.m_Description = @"";
            if (savedRecords.firstObject) {
                response.m_Record = [self parseRecordFrom:savedRecords.firstObject withName:recordData.m_RecordName];
            }
        }
        ISN_SendCallbackToUnity(CloudKitCallback, [response toJSONString]);
    };
    return operation;
}

- (void)updateRecord:(ISN_CloudKitRecord *)recordData databaseType:(NSString *)type dataArray:(NSMutableArray<NSData *> *)data savePolicy:(int)policy {
    CKDatabase *database = [self parsDataBaseTypeFrom:type];
    CKRecordID *recordID = [self createRecordIDFrom:recordData];
    if (policy != 0) {
        CKRecord *record = [[CKRecord alloc] initWithRecordType:recordData.m_RecordType recordID:recordID];
        CKModifyRecordsOperation *operation = [self createUpdateOperationFor:record withRecordData:recordData withData:data savePolicy:policy];
        [database addOperation: operation];
        return;
    }
    [database fetchRecordWithID:recordID completionHandler:^(CKRecord * _Nullable record, NSError * _Nullable error) {
        if (!error) {
            dispatch_async(dispatch_get_main_queue(), ^{
                CKModifyRecordsOperation *operation = [self createUpdateOperationFor:record withRecordData:recordData withData:data savePolicy:policy];
                [database addOperation: operation];
            });
        }
    }];
}

@end

extern "C" {
    NSMutableArray<NSData *>* GetPointersArray(CFTypeRef pointers[], int dataSize[], int pointersAmout) {
        [ISN_Logger LogNativeMethodInvoke:"GetPointerArray" data:""];
        NSMutableArray<NSData *> *dataArray;
        if (pointers && pointersAmout > 0) {
            dataArray = [[NSMutableArray alloc] init];
            for (int i = 0; i < pointersAmout; i++) {
                NSData *data = [NSData dataWithBytes:pointers[i] length:(NSUInteger)dataSize[i]];
                if (data) {
                    [dataArray addObject:data];
                } else {
                    NSLog(@"Data is nil");
                }
            }
        }
        return dataArray;
    }
    
    void _ISN_CK_AccoutStatus(UnityAction *callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CK_AccoutStatus" data:""];
        [[CKContainer defaultContainer] accountStatusWithCompletionHandler:^(CKAccountStatus accountStatus, NSError * _Nullable error) {
            ISN_CloudKitResponse *response = [[ISN_CloudKitResponse alloc] init];
            if (error) {
                response.m_State = errorResponseState;
                response.m_Description = error.description;
            } else {
                response.m_State = successResponseState;
                response.m_Description = Status[accountStatus];
            }
            ISN_SendCallbackToUnity(callback, [response toJSONString]);
        }];
    }

    void _ISN_CK_AccoutStatusNotification(UnityAction *callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CK_AccoutStatusNotification" data:""];
        [[ISN_CloudKitContainer sharedInstance] setCallback:callback];
    }

    void _ISN_CK_SaveRecord(char *data, char *databaseType, CFTypeRef pointers[], int dataSize[], int pointersAmout, UnityAction *callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CK_SaveRecord" data:data];
        NSMutableArray<NSData *> *dataArray = GetPointersArray(pointers, dataSize, pointersAmout);
        
        NSError *error;
        ISN_CloudKitRecord *recordData = [[ISN_CloudKitRecord alloc] initWithChar:data error: &error];
        CloudKitCallback = callback;
        if (error) {
            [ISN_Logger LogError:@"_ISN_CloudKit_SaveRecord JSON parsing error: %@", error.description];
            ISN_CloudKitResponse *response = [[ISN_CloudKitResponse alloc] init];
            response.m_State = errorResponseState;
            response.m_Description = error.description;
            ISN_SendCallbackToUnity(CloudKitCallback, [response toJSONString]);
        } else {
            NSString *type = ISN_ConvertToString(databaseType);
            ISN_CloudKit *cloudKit = [[ISN_CloudKit alloc] init];
            [cloudKit saveRecordWith:recordData databaseType:type dataArray:dataArray];
        }
    }

    void _ISN_CK_RemoveRecordByName(char *recordName, char *databaseType, UnityAction *callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CK_RemoveRecordByName" data:recordName];
        CloudKitCallback = callback;
        NSString *type = ISN_ConvertToString(databaseType);
        NSString *name = ISN_ConvertToString(recordName);
        ISN_CloudKit *cloudKit = [[ISN_CloudKit alloc] init];
        [cloudKit removeRecordByName:name databaseType:type];
    }

    void _ISN_CK_FetchRecordByName(char *recordName, char *databaseType, UnityAction *callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CK_FetchRecordByName" data:recordName];
        CloudKitCallback = callback;
        NSString *type = ISN_ConvertToString(databaseType);
        NSString *name = ISN_ConvertToString(recordName);
        ISN_CloudKit *cloudKit = [[ISN_CloudKit alloc] init];
        [cloudKit fetchRecordByName:name databaseType:type];
    }

    void _ISN_CK_UpdateRecord(char *data, int savePolicy, char *databaseType, CFTypeRef pointers[], int dataSize[], int pointersAmout, UnityAction *callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CK_UpdateRecord" data:data];
        NSMutableArray<NSData *> *dataArray = GetPointersArray(pointers, dataSize, pointersAmout);
        
        NSError *error;
        ISN_CloudKitRecord *recordData = [[ISN_CloudKitRecord alloc] initWithChar:data error: &error];
        CloudKitCallback = callback;
        if (error) {
            [ISN_Logger LogError:@"_ISN_CK_UpdateRecord JSON parsing error: %@", error.description];
            ISN_CloudKitResponse *response = [[ISN_CloudKitResponse alloc] init];
            response.m_State = errorResponseState;
            response.m_Description = error.description;
            ISN_SendCallbackToUnity(CloudKitCallback, [response toJSONString]);
        } else {
            NSString *type = ISN_ConvertToString(databaseType);
            ISN_CloudKit *cloudKit = [[ISN_CloudKit alloc] init];
            [cloudKit updateRecord:recordData databaseType:type dataArray:dataArray savePolicy:savePolicy];
        }
    }

    void* _ISN_GetData(char *fileName, int* size) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GetData" data:fileName];
        NSString *name = ISN_ConvertToString(fileName);
        NSURL *tmpDirURL = [NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:YES];
        NSURL *fileURL = [[tmpDirURL URLByAppendingPathComponent:name] URLByAppendingPathExtension:@"data"];
        NSError *error;
        NSMutableData *data = [NSMutableData dataWithContentsOfURL:fileURL options:NSDataReadingMapped error:&error];
        if (error) {
            NSLog(@"We got error when tried to read file - %@", error.description);
        } else {
            NSFileManager *fileManager = [NSFileManager defaultManager];
            [fileManager removeItemAtURL:fileURL error:nil];
        }
        *size = (int)data.length;
        return [data mutableBytes];
    }
}
