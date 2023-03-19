#import <Foundation/Foundation.h>
#import "ISN_Foundation.h"

@interface ISN_NSBuildInfo : JSONModel
@property (nonatomic) NSString* m_AppVersion;
@property (nonatomic) NSString* m_BuildNumber;
@end


@implementation ISN_NSBuildInfo
-(id) init { return self = [super init]; }
@end

@protocol ISN_NSBundle;
@interface ISN_NSBundle : JSONModel
@property (nonatomic) NSString* m_PreferredLocalization;
@property (nonatomic) NSString* m_DevelopmentLocalization;

-(id) initWithNSBundle:(NSBundle *) bundle;
@end

@implementation ISN_NSBundle : JSONModel
-(id) initWithNSBundle:(NSBundle *) bundle {
    self = [super init];
    if(self) {
        if(bundle != NULL) {
            self.m_PreferredLocalization   = [[bundle preferredLocalizations] firstObject];
            self.m_DevelopmentLocalization =  [bundle developmentLocalization];
        }
    }
    return self;
}
@end

extern "C" {

    //we don't have this on Unity C# part
    bool _ISN_NS_isAppStoreReceiptSandbox() {
#if TARGET_IPHONE_SIMULATOR
        return NO;
#else
        NSURL *appStoreReceiptURL = NSBundle.mainBundle.appStoreReceiptURL;
        NSString *appStoreReceiptLastComponent = appStoreReceiptURL.lastPathComponent;

        BOOL isSandboxReceipt = [appStoreReceiptLastComponent isEqualToString:@"sandboxReceipt"];
        return isSandboxReceipt;
#endif
    }

    bool _ISN_NS_IsRunningInAppStoreEnvironment() {
#if TARGET_IPHONE_SIMULATOR
        return NO;
#else
        bool hasEmbeddedMobileProvision = [[NSBundle mainBundle] pathForResource:@"embedded" ofType:@"mobileprovision"];
        if (_ISN_NS_isAppStoreReceiptSandbox() || hasEmbeddedMobileProvision) {
            return NO;
        }
        return YES;
#endif
    }

    char* _ISN_NS_GetBuildInfo() {
        ISN_NSBuildInfo *buildInfo = [[ISN_NSBuildInfo alloc] init];
        NSDictionary *infoDict = [[NSBundle mainBundle] infoDictionary];
        [buildInfo setM_AppVersion:[infoDict objectForKey:@"CFBundleShortVersionString"]]; // example: 1.0.0
        [buildInfo setM_BuildNumber:[infoDict objectForKey:@"CFBundleVersion"]]; // example: 42

        return ISN_ConvertToChar([buildInfo toJSONString]);
    }

    char* _ISN_NS_GetMainBundle() {
        NSBundle* bundle = [NSBundle mainBundle];
        ISN_NSBundle* isn_bundle = [[ISN_NSBundle alloc] initWithNSBundle:bundle];

        return ISN_ConvertToChar([isn_bundle toJSONString]);
    }
}


