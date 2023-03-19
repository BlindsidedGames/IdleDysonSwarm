#if !TARGET_OS_TV
#import "ISN_UNUserNotificationCenterDelegate.h"
#import "ISN_UNCommunication.h"


@implementation ISN_UNUserNotificationCenterDelegate


// The method will be called on the delegate only if the application is in the foreground. If the method is not implemented or the handler is not called in a timely manner then the notification will not be presented. The application can choose to have the notification presented as a sound, badge, alert and/or in the notification list. This decision should be based on whether the information in the notification is otherwise visible to the user.

- (void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler {
    
    ISN_UNNotification* isn_notification = [[ISN_UNNotification alloc] initWithUNNotification:notification];
    ISN_SendMessage(UNITY_UN_LISTENER, "WillPresentNotificationEvent", [isn_notification toJSONString]);
    
    completionHandler(UNNotificationPresentationOptionAlert);
}

// The method will be called on the delegate when the user responded to the notification by opening the application, dismissing the notification or choosing a UNNotificationAction. The delegate must be set before the application returns from application:didFinishLaunchingWithOptions:.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void(^)(void))completionHandler  {
    
    
    ISN_UNNotificationResponse* isn_response = [[ISN_UNNotificationResponse alloc] initWithUNNotificationResponse:response];
    self.m_lastReceivedResponse = isn_response;
    ISN_SendMessage(UNITY_UN_LISTENER, "DidReceiveNotificationResponseEvent", [isn_response toJSONString]);
    
    completionHandler();
    
}


@end

#endif


