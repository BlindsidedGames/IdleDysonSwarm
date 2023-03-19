#import "ISN_UNUserNotificationCenterDelegate.h"

#if !TARGET_OS_TV

@interface ISN_UNUserNotificationCenter : NSObject
@property (nonatomic, strong) ISN_UNUserNotificationCenterDelegate *m_userNotificationDelegate;

+ (id)sharedInstance;
- (void) addDelegate;
@end

#endif
