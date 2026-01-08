#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import "ISN_Foundation.h"

@interface ISN_UIDevice : JSONModel
@property (nonatomic) NSString *m_Name;
@property (nonatomic) NSString *m_SystemName;
@property (nonatomic) NSString *m_Model;
@property (nonatomic) NSString *m_LocalizedModel;
@property (nonatomic) NSString *m_SystemVersion;
@property (nonatomic) UIUserInterfaceIdiom m_UserInterfaceIdiom;

@property (nonatomic) NSString * m_IdentifierForVendor;

//Addtional fileds
@property (nonatomic) int m_MajorIOSVersion;
@end

@implementation ISN_UIDevice
-(id) init {
    self = [super init];
    if(self) {
        UIDevice* device = [UIDevice currentDevice] ;
        self.m_Name         = device.name    == NULL ? @"" : device.name;
        self.m_SystemName         = device.systemName    == NULL ? @"" : device.systemName;
        self.m_Model         = device.model    == NULL ? @"" : device.model;
        self.m_LocalizedModel         = device.localizedModel    == NULL ? @"" : device.localizedModel;
        self.m_SystemVersion         = device.systemVersion    == NULL ? @"" : device.systemVersion;
        self.m_UserInterfaceIdiom = UI_USER_INTERFACE_IDIOM();

        NSUUID *vendorIdentifier = [[UIDevice currentDevice] identifierForVendor];
        uuid_t uuid;
        [vendorIdentifier getUUIDBytes:uuid];

        NSData *vendorData = [NSData dataWithBytes:uuid length:16];
        NSString *encodedString = [vendorData base64EncodedStringWithOptions:NSDataBase64DecodingIgnoreUnknownCharacters];
        self.m_IdentifierForVendor = encodedString;


        if(device.systemVersion!=NULL) {
            NSArray* vComp = [device.systemVersion componentsSeparatedByString:@"."];
            self.m_MajorIOSVersion  = [[vComp objectAtIndex:0] intValue];
        } else {
            self.m_MajorIOSVersion = 0;
        }

    }
    return self;
}
@end


extern "C" {

    char* _ISN_UI_GetCurrentDevice() {
        ISN_UIDevice * device = [[ISN_UIDevice alloc] init];
        const char* string = [[device toJSONString] UTF8String];
        char* res = (char*)malloc(strlen(string) + 1);
        strcpy(res, string);
        return res;
    }
}





