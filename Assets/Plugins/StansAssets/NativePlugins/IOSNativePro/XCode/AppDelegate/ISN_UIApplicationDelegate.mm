#define USER_NOTIFICATIONS_API_ENABLED

////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////


#import <Foundation/Foundation.h>

#import "UnityAppController.h"   //our link to the base class.
#import "ISN_Foundation.h"
#import "ISN_UICommunication.h"

#ifdef USER_NOTIFICATIONS_API_ENABLED
#import "ISN_UNUserNotificationCenter.h"
#endif

static UnityAction UIApplicationDelegateCallback;

@interface ISN_UIApplicationDelegate : UnityAppController  //extend from UnityAppController.

@end

@implementation ISN_UIApplicationDelegate

//--------------------------------------
//  Initialization
//--------------------------------------

-(id) init { return self = [super init]; }

//--------------------------------------
//  Static Methods
//--------------------------------------

+ (void) sendMessage: (const char* ) event {
    [self sendMessage:event withParams:@""];
}

+ (void) sendMessage: (const char* ) event withParams:(NSString*) params {
    ISN_UIApplicationEvents *m_event = [ISN_UIApplicationEvents new];
    [m_event init:[NSString stringWithUTF8String:event] data:params];
    ISN_SendCallbackToUnity(UIApplicationDelegateCallback, [m_event toJSONString]);
}

//--------------------------------------
//  Unity Events
//--------------------------------------

-(void) startUnity: (UIApplication*) application {
    [super startUnity: application];
}

//--------------------------------------
//  Application State Events
//--------------------------------------

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {

    #if !TARGET_OS_TV
        #ifdef USER_NOTIFICATIONS_API_ENABLED
        [[ISN_UNUserNotificationCenter sharedInstance] addDelegate];
        #endif
    #endif

    return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

//--------------------------------------
//  App Shortcut
//--------------------------------------

static NSString* appOpenshortcutItem  = @"";

#if !TARGET_OS_TV
- (void)application:(UIApplication *)application performActionForShortcutItem:(UIApplicationShortcutItem *)shortcutItem  completionHandler:(void (^)(BOOL succeeded))completionHandler {

    appOpenshortcutItem = [shortcutItem type];
    [ISN_UIApplicationDelegate sendMessage:"performActionForShortcutItem" withParams:appOpenshortcutItem];

}
#endif

+ (NSString*) getAppOpenshortcutItem {
    return  appOpenshortcutItem;
}

- (void)applicationDidEnterBackground:(UIApplication*)application {
    [ISN_UIApplicationDelegate sendMessage:"applicationDidEnterBackground"];
    [super applicationDidEnterBackground:application];
}

- (void)applicationWillEnterForeground:(UIApplication*)application {
    [ISN_UIApplicationDelegate sendMessage:"applicationWillEnterForeground"];
    [super applicationWillEnterForeground:application];
}

- (void)applicationDidBecomeActive:(UIApplication*)application {
    [ISN_UIApplicationDelegate sendMessage:"applicationDidBecomeActive"];
    [super applicationDidBecomeActive:application];
}

- (void)applicationWillResignActive:(UIApplication*)application {
    [ISN_UIApplicationDelegate sendMessage:"applicationWillResignActive"];
    [super applicationWillResignActive:application];
}

- (void)applicationDidReceiveMemoryWarning:(UIApplication*)application {
    [ISN_UIApplicationDelegate sendMessage:"applicationDidReceiveMemoryWarning"];
    [super applicationDidReceiveMemoryWarning:application];
}

- (void)applicationWillTerminate:(UIApplication*)application {
    [ISN_UIApplicationDelegate sendMessage:"applicationWillTerminate"];
    [super applicationWillTerminate:application];
}

//--------------------------------------
// Push notifications
//--------------------------------------

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
    ISN_UIRegisterRemoteNotificationsResult *result = [[ISN_UIRegisterRemoteNotificationsResult alloc] init];

    if(SYSTEM_VERSION_GREATER_THAN_OR_EQUAL_TO(@"13")) {
        NSLog(@"device token with iOS 13");
        result.m_DeviceTokenUtf8 = [self stringFromDeviceToken:deviceToken];
    } else {
        result.m_DeviceTokenUtf8 = [[[[deviceToken description]
          stringByReplacingOccurrencesOfString: @"<" withString: @""]
         stringByReplacingOccurrencesOfString: @">" withString: @""]
        stringByReplacingOccurrencesOfString: @" " withString: @""];
    }

    [ISN_UIApplicationDelegate sendMessage:"RemoteNotificationsRegisterationResult" withParams:[result toJSONString]];
    try {
        [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
    } catch (NSException *exception) {
        NSLog(@"UnityAppController:didRegisterForRemoteNotificationsWithDeviceToken crashed: %@", exception.reason);
    }
}

- (NSString *)stringFromDeviceToken:(NSData *)deviceToken {
    NSUInteger length = deviceToken.length;
    if (length == 0) {
        return nil;
    }

    unsigned char* buffer = (unsigned char*) [deviceToken bytes];
    NSMutableString *hexString  = [NSMutableString stringWithCapacity:(length * 2)];
    for (int i = 0; i < length; ++i) {
        [hexString appendFormat:@"%02x", buffer[i]];
    }
    return [hexString copy];
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
    ISN_UIRegisterRemoteNotificationsResult *result = [[ISN_UIRegisterRemoteNotificationsResult alloc] initWithNSError:error];

    [ISN_UIApplicationDelegate sendMessage:"RemoteNotificationsRegisterationResult" withParams:[result toJSONString]];
    try {
        [super application:application didFailToRegisterForRemoteNotificationsWithError:error];
    } catch (NSException *exception) {
        NSLog(@"UnityAppController:didFailToRegisterForRemoteNotificationsWithError crashed: %@", exception.reason);
    }
}

//--------------------------------------
//  Universal Links (Deeplinking)
//--------------------------------------

static NSString* webpageURL  = @"";

-(BOOL) application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {
    if ([userActivity.activityType isEqualToString:NSUserActivityTypeBrowsingWeb]) {
        webpageURL = userActivity.webpageURL.absoluteString;
        [ISN_UIApplicationDelegate sendMessage:"continueUserActivity" withParams:webpageURL];
    }

    return true;
}

+ (NSString*) getLaunchUniversalLink {
    return  webpageURL;
}


//--------------------------------------
//  Application URL Sheme
//--------------------------------------


static NSString* appOpenUrl  = @"";
//static NSString* appSourceApplication  = @"";

#if !TARGET_OS_TV
- (BOOL)application:(UIApplication*)application openURL:(nonnull NSURL *)url options:(nonnull NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
      appOpenUrl = [url absoluteString];
     [ISN_UIApplicationDelegate sendMessage:"openURL" withParams:appOpenUrl];

    @try {
        return [super application:application openURL:url options:options];
    }
    @catch (NSException *exception) {
        NSLog(@"exception: %@", exception.reason);
        return true;
    }
}
#endif

+ (NSString*) getAppOpenUrl {
    return  appOpenUrl;
}


@end

IMPL_APP_CONTROLLER_SUBCLASS( ISN_UIApplicationDelegate )


extern "C" {

    void _ISN_AppDelegate_Subscribe(UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_AppDelegate_Subscribe" data:""];
        UIApplicationDelegateCallback = callback;
    }


    char* _ISN_AppDelegate_GetAppOpenShortcutItem() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_AppDelegate_GetAppOpenShortcutItem" data:""];

        NSString *Data = [ISN_UIApplicationDelegate getAppOpenshortcutItem];

        const char* string = [Data UTF8String];
        char* res = (char*)malloc(strlen(string) + 1);
        strcpy(res, string);
        return res;
    }

    char* _ISN_AppDelegate_GetLaunchUniversalLink() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_AppDelegate_GetLaunchUniversalLink" data:""];

        NSString *Data = [ISN_UIApplicationDelegate getLaunchUniversalLink];

        const char* string = [Data UTF8String];
        char* res = (char*)malloc(strlen(string) + 1);
        strcpy(res, string);
        return res;
    }

    char* _ISN_AppDelegate_GetLaunchURL() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_AppDelegate_GetLaunchURL" data:""];

        NSString *Data = [ISN_UIApplicationDelegate getAppOpenUrl];

        const char* string = [Data UTF8String];
        char* res = (char*)malloc(strlen(string) + 1);
        strcpy(res, string);
        return res;
    }
}
