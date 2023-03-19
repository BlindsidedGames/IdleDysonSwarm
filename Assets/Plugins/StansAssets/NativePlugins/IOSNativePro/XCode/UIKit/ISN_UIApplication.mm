#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

#import "ISN_UICommunication.h"

extern "C" {
    
    
    void _ISN_UI_SetApplicationBagesNumber(int count)  {
#if !TARGET_OS_TV
        [UIApplication sharedApplication].applicationIconBadgeNumber = count;
#endif
    }
    
    long _ISN_UI_GetApplicationBagesNumber() {
#if !TARGET_OS_TV
        return [UIApplication sharedApplication].applicationIconBadgeNumber;
#endif
    }
    
    
    //we don't have thison on Unity C# part
    bool _ISN_UI_isAppStoreReceiptSandbox() {
#if TARGET_IPHONE_SIMULATOR
        return NO;
#else
        NSURL *appStoreReceiptURL = NSBundle.mainBundle.appStoreReceiptURL;
        NSString *appStoreReceiptLastComponent = appStoreReceiptURL.lastPathComponent;
        
        BOOL isSandboxReceipt = [appStoreReceiptLastComponent isEqualToString:@"sandboxReceipt"];
        return isSandboxReceipt;
#endif
    }
    
    
    bool _ISN_UI_IsRunningInAppStoreEnvironment() {
#if TARGET_IPHONE_SIMULATOR
        return NO;
#else
        bool hasEmbeddedMobileProvision = [[NSBundle mainBundle] pathForResource:@"embedded" ofType:@"mobileprovision"];
        if (_ISN_UI_isAppStoreReceiptSandbox() || hasEmbeddedMobileProvision) {
            return NO;
        }
        return YES;
#endif
    }
    
    
    BOOL _ISN_UI_CanOpenURL(char* url) {
        NSURL *uri = [NSURL URLWithString:[NSString stringWithUTF8String: url]];
        return [[UIApplication sharedApplication] canOpenURL:uri];
    }
    
    void _ISN_UI_OpenUrl(char* url) {
        [[UIApplication sharedApplication] openURL:[NSURL URLWithString:[NSString stringWithUTF8String: url]]];
    }
    
    void _ISN_UI_Suspend() {
        UIApplication *app = [UIApplication sharedApplication];
        [app performSelector:@selector(suspend)];
    }
    
    char* _ISN_UI_GetBuildInfo() {
        
        ISN_BuildInfo *buildInfo = [[ISN_BuildInfo alloc] init];
        NSDictionary *infoDict = [[NSBundle mainBundle] infoDictionary];
        [buildInfo setM_appVersion:[infoDict objectForKey:@"CFBundleShortVersionString"]]; // example: 1.0.0
        [buildInfo setM_buildNumber:[infoDict objectForKey:@"CFBundleVersion"]]; // example: 42
        
        return  ISN_ConvertToChar([buildInfo toJSONString]);
        
    }
    
    char* _ISN_UIApplicationOpenSettingsURLString() {
        return  ISN_ConvertToChar(UIApplicationOpenSettingsURLString);
    }
    
    void _ISN_UI_RegisterForRemoteNotifications() {
        [[UIApplication sharedApplication] registerForRemoteNotifications];
    }
    
    void _ISN_UI_UnregisterForRemoteNotifications() {
        [[UIApplication sharedApplication] unregisterForRemoteNotifications];
    }
    
}

