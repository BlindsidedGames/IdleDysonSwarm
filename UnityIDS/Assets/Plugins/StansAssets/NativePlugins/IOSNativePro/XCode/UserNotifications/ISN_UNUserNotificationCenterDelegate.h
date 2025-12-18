#import "JSONModel.h"
#import "ISN_Foundation.h"
#import "ISN_UNCommunication.h"
#import <UserNotifications/UserNotifications.h>

#if !TARGET_OS_TV

@interface ISN_UNUserNotificationCenterDelegate : NSObject<UNUserNotificationCenterDelegate>
@property (nonatomic, strong) ISN_UNNotificationResponse *m_lastReceivedResponse;
@end

#endif



