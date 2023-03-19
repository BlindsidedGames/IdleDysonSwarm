//
//  ISN_CKCommunication.h
//  Unity-iPhone
//
//  Created by Roman on 06.09.2020.
//
#import <Foundation/Foundation.h>
#import "ISN_Foundation.h"
#import <CloudKit/CloudKit.h>

NSString* const Status[] = {
    [CKAccountStatusCouldNotDetermine] = @"CKAccountStatusCouldNotDetermine",
    [CKAccountStatusAvailable]  = @"CKAccountStatusAvailable",
    [CKAccountStatusRestricted] = @"CKAccountStatusRestricted",
    [CKAccountStatusNoAccount] = @"CKAccountStatusNoAccount"
};

CKRecordSavePolicy const SavePolicy[] = {
    [0] = CKRecordSaveIfServerRecordUnchanged,
    [1] = CKRecordSaveChangedKeys,
    [2] = CKRecordSaveAllKeys
};

static UnityAction *CloudKitCallback;
static NSString *successResponseState = @"SUCCESS";
static NSString *errorResponseState = @"ERROR";
static NSString *numberFieldType = @"Number";
static NSString *stringFieldType = @"String";
static NSString *dateFieldType = @"Date";
static NSString *dataFieldType = @"Data";
static NSString *assetFieldType = @"Asset";
static NSString *dateFormat = @"dd-MM-yyyy-HH:mm:ss";

@interface ISN_CKRecordField : JSONModel
@property (nonatomic) NSString *m_Key;
@property (nonatomic) NSString *m_Value;
@property (nonatomic) NSString *m_Type;
@end

@interface ISN_CloudKitRecord : JSONModel
@property (nonatomic) NSString *m_RecordType;
@property (nonatomic) NSString *m_RecordName;
@property (nonatomic) NSString *m_ZoneName;
@property (nonatomic) NSString *m_OwnerName;
@property (nonatomic) NSString *m_RecordChangeTag;
@property (nonatomic) NSMutableArray <id> *m_Fields;
@end

@interface ISN_CloudKitResponse : JSONModel
@property (nonatomic) NSString *m_State;
@property (nonatomic) NSString *m_Description;
@property (nonatomic) int m_ErrorCode;
@property (nonatomic) ISN_CloudKitRecord *m_Record;
@end

@interface ISN_CloudKitContainer : NSObject
+(ISN_CloudKitContainer *)sharedInstance;
-(void)setCallback:(UnityAction *)callback;
@end
