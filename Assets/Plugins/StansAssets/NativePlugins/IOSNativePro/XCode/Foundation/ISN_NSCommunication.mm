#import "ISN_NSCommunication.h"



@implementation ISN_NSArrayModel
-(id) init { return self = [super init]; }
@end


@implementation ISN_NSKeyValueResult
    -(id) init { return self = [super init]; }
    -(id) initWithNSKeyValueObject:(ISN_NSKeyValueObject *) keyValueObject {
        self = [super init];
        if(self) {
            self.m_KeyValueObject = keyValueObject;
        }
        return self;
    }
@end

@implementation ISN_NSKeyValueObject
    -(id) init { return self = [super init]; }
    -(id) initWithData:(NSString *) key value:(NSString *) value {
        self = [super init];
        if(self) {
            self.m_Key = key;
            self.m_Value = value;
        }
        return self;
    }
@end

@implementation ISN_NSStoreDidChangeExternallyNotification
-(id) init {
    self = [super init];
    if(self) {
        self.m_Reason = -1;
    }
    
    return self;
}
@end


//So far those models are only used for a user notifications API


@implementation ISN_NSDateComponents

-(id) initWithNSDateComponents:(NSDateComponents *) date {
    self = [super init];
    if(self) {
        
        self.Hour = date.hour;
        self.Minute = date.minute;
        self.Second = date.second;
        self.Nanosecond = date.nanosecond;
       
        self.Year = date.year;
        self.Month = date.month;
        self.Day = date.day;
        self.Weekday = date.weekday;

    }
    return self;
}

-(NSDateComponents *) getNSDateComponents {
    NSDateComponents* date = [[NSDateComponents alloc] init];
    if(self.Hour != 0) {date.hour = self.Hour; }
    if(self.Minute != 0) {date.minute = self.Minute; }
    if(self.Second != 0) {date.second = self.Second; }
    if(self.Nanosecond != 0) {date.nanosecond = self.Nanosecond; }
    
    if(self.Year != 0) {date.year = self.Year; }
    if(self.Month != 0) {date.month = self.Month; }
    if(self.Day != 0) {date.day = self.Day; }
    if(self.Weekday != 0) {date.weekday = self.Weekday; }
    
    return  date;
}

@end


@implementation ISN_NSRange : JSONModel


-(id) initWithNSRange:(NSRange) range {
    self = [super init];
    if(self) {
        self.m_Length = range.length;
        self.m_Location = range.location;
    }
    return self;
}


-(NSRange) getNSRange {
    return NSMakeRange(self.m_Location, self.m_Length);
}

@end

@implementation ISN_NSURL : JSONModel
-(NSURL* ) toNSURL {
    switch (self.m_Type) {
        case 1: //File
            return [NSURL fileURLWithPath:self.m_Url];
            break;
        default:
            return [NSURL URLWithString:self.m_Url];
            break;
    }
}

@end



@implementation ISN_NSLocale : JSONModel

-(id) initWithNSLocale:(NSLocale *) locale {
    self = [super init];
    if(self) {
        if(locale != NULL) {
            self.m_Identifier       = [locale localeIdentifier];
            self.m_CountryCode      = [locale countryCode];
            self.m_LanguageCode     = [locale languageCode];
            self.m_CurrencySymbol   = [locale currencySymbol];
            self.m_CurrencyCode     = [locale currencyCode];
            
        }
    }
    return self;
}

@end

@implementation ISN_NSPersonNameComponents
-(id) initWithData:(NSPersonNameComponents *) date {
    self = [super init];
    if(self) {
        if(date.namePrefix != nil) { self.m_NamePrefix = date.namePrefix; }
        if(date.givenName != nil)  { self.m_GivenName = date.givenName; }
        if(date.middleName != nil) { self.m_MiddleName = date.middleName; }
        if(date.familyName != nil) { self.m_FamilyName = date.familyName; }
        if(date.nameSuffix != nil) { self.m_NameSuffix = date.nameSuffix; }
        if(date.nickname != nil) { self.m_Nickname = date.nickname; }
    }
    return self;
}
@end
