#import "JSONModel.h"
#import "ISN_Foundation.h"



@protocol ISN_NSArrayModel;
@interface ISN_NSArrayModel : JSONModel
@property (nonatomic) NSArray<NSString*> *m_Value;
@end

@protocol ISN_NSKeyValueObject;
@interface ISN_NSKeyValueObject : JSONModel
@property (nonatomic) NSString *m_Key;
@property (nonatomic) NSString *m_Value;

-(id) initWithData:(NSString *) key value:(NSString *) value;
@end


@interface  ISN_NSKeyValueResult : SA_Result
@property (nonatomic) ISN_NSKeyValueObject *m_KeyValueObject;

-(id) initWithNSKeyValueObject:(ISN_NSKeyValueObject *) keyValueObject;
@end

@interface ISN_NSStoreDidChangeExternallyNotification : JSONModel
@property (nonatomic) int m_Reason;
@property (nonatomic) NSArray<ISN_NSKeyValueObject> *m_UpdatedData;
@end


//So far those models are only used for a user notifications API

@interface ISN_NSDateComponents : JSONModel
@property (nonatomic) long Hour;
@property (nonatomic) long Minute;
@property (nonatomic) long Second;
@property (nonatomic) long Nanosecond;

@property (nonatomic) long Year;
@property (nonatomic) long Month;
@property (nonatomic) long Day;
@property (nonatomic) long Weekday;



-(id) initWithNSDateComponents:(NSDateComponents *) date;
-(NSDateComponents *) getNSDateComponents;
@end

@protocol ISN_NSRange;
@interface ISN_NSRange : JSONModel

@property(nonatomic) long m_Location;
@property(nonatomic) long m_Length;

-(id) initWithNSRange:(NSRange ) range;
-(NSRange ) getNSRange;

@end

@protocol ISN_NSURL;
@interface ISN_NSURL : JSONModel
@property(nonatomic) NSString* m_Url;
@property(nonatomic) int m_Type;

-(NSURL* ) toNSURL;
@end

@protocol ISN_NSLocale;
@interface ISN_NSLocale : JSONModel
@property (nonatomic) NSString* m_Identifier;
@property (nonatomic) NSString* m_CountryCode;
@property (nonatomic) NSString* m_LanguageCode;
@property (nonatomic) NSString* m_CurrencySymbol;
@property (nonatomic) NSString* m_CurrencyCode;


-(id) initWithNSLocale:(NSLocale *) locale;
@end


@interface ISN_NSPersonNameComponents : JSONModel
@property (nonatomic) NSString *m_NamePrefix;
@property (nonatomic) NSString *m_GivenName;
@property (nonatomic) NSString *m_MiddleName;
@property (nonatomic) NSString *m_FamilyName;
@property (nonatomic) NSString *m_NameSuffix;
@property (nonatomic) NSString *m_Nickname;

-(id) initWithData:(NSPersonNameComponents *) date;
@end
