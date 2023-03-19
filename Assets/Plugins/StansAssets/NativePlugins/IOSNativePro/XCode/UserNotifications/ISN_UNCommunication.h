//#define CORE_LOCATION_API_ENABLED

#if !TARGET_OS_TV

#import "JSONModel.h"
#import "ISN_Foundation.h"
#import "ISN_NSCommunication.h"
#import <UserNotifications/UserNotifications.h>

#ifdef CORE_LOCATION_API_ENABLED
#import "ISN_CLCommunication.h"
#endif

typedef NS_ENUM(NSInteger, ISN_UNNotificationTriggerType) {
    ISN_UNNotificationTriggerTypeTimeInterval,
    ISN_UNNotificationTriggerTypeCalendar,

#ifdef CORE_LOCATION_API_ENABLED
    ISN_UNNotificationTriggerTypeLocation,
#endif
    ISN_UNNotificationTriggerTypePushNotification
};


@interface ISN_UNNotificationSettings : JSONModel
@property (nonatomic) UNAuthorizationStatus m_AuthorizationStatus;
@property (nonatomic) UNNotificationSetting m_NotificationCenterSetting;
@property (nonatomic) UNNotificationSetting m_LockScreenSetting;
@property (nonatomic) UNNotificationSetting m_CarPlaySetting;
@property (nonatomic) UNNotificationSetting m_AlertSetting;
@property (nonatomic) UNAlertStyle m_AlertStyle;
@property (nonatomic) UNNotificationSetting m_BadgeSetting;
@property (nonatomic) UNNotificationSetting m_SoundSetting;
@property (nonatomic) UNShowPreviewsSetting m_ShowPreviewsSetting;


-(id) initWithSettings:(UNNotificationSettings *) settings;
@end


@interface ISN_UNMutableNotificationContent: JSONModel

@property (nonatomic) NSString *m_Title;
@property (nonatomic) NSString *m_Subtitle;
@property (nonatomic) NSString *m_Body;
@property (nonatomic) long m_Badge;
@property (nonatomic) NSString *m_Sound;
@property (nonatomic) NSString *m_UserInfo;

-(id) initWithContent:(UNNotificationContent *) content;
-(UNNotificationContent* ) getNotificationContent;
@end

@interface ISN_ISN_UNNotificationTrigger: JSONModel
@property (nonatomic) bool m_Repeats;
@property (nonatomic) long m_NextTriggerDate;
@property (nonatomic) ISN_UNNotificationTriggerType m_Type;
@property (nonatomic) long m_TimeInterval;
@property (nonatomic) ISN_NSDateComponents* m_DateComponents;
#ifdef CORE_LOCATION_API_ENABLED
@property (nonatomic) ISN_CLCircularRegion *m_Region;
#endif

-(id) initWithTrigger:(UNNotificationTrigger *) trigger;
-(UNNotificationTrigger* ) getTrigger;
@end

@protocol ISN_UNNotificationRequest;
@interface ISN_UNNotificationRequest: JSONModel
@property(nonatomic) NSString *m_Identifier;
@property(nonatomic) ISN_UNMutableNotificationContent *m_Content;
@property(nonatomic) ISN_ISN_UNNotificationTrigger *m_Trigger;

-(id) initWithRequest:(UNNotificationRequest *) request;
-(UNNotificationRequest*) getRequest;
@end



@protocol ISN_UNNotification;
@interface ISN_UNNotification : JSONModel
@property(nonatomic) long m_Date;
@property(nonatomic) ISN_UNNotificationRequest *m_Request;

-(id) initWithUNNotification:(UNNotification *) notification;
@end


@interface ISN_UNNotificationResponse : JSONModel
@property (nonatomic) ISN_UNNotification *m_Notification;
@property (nonatomic) NSString *m_ActionIdentifier;

-(id) initWithUNNotificationResponse:(UNNotificationResponse *) response;
@end



@interface ISN_UNNotifcationRequestsIds : JSONModel
@property (nonatomic) NSArray <NSString *> *m_NotificationIds;
@end

@interface ISN_UNNotificationRequests : JSONModel
@property (nonatomic) NSArray <ISN_UNNotificationRequest> *m_Requests;
@end


@interface ISN_UNNotifcations : JSONModel
@property (nonatomic) NSArray <ISN_UNNotification> *m_Notifications;
@end



#endif
