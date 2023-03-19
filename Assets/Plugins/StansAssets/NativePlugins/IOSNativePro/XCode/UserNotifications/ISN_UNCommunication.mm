//#define CORE_LOCATION_API_ENABLED
#if !TARGET_OS_TV


#import "ISN_UNCommunication.h"

@implementation ISN_UNNotificationSettings
    -(id) init { return self = [super init]; }
    -(id) initWithSettings:(UNNotificationSettings *) settings {
        self = [super init];
        if(self) {
            self.m_AuthorizationStatus = settings.authorizationStatus;
            self.m_NotificationCenterSetting = settings.notificationCenterSetting;
            self.m_LockScreenSetting = settings.lockScreenSetting;
            self.m_CarPlaySetting = settings.carPlaySetting;
            self.m_AlertSetting = settings.alertSetting;
            self.m_AlertStyle = settings.alertStyle;
            self.m_BadgeSetting = settings.badgeSetting;
            self.m_SoundSetting = settings.soundSetting;
            self.m_ShowPreviewsSetting = settings.showPreviewsSetting;
        }
        return self;
    }
@end


NSString* DEFAULT_SOUND = @"DefaultSound";
NSString* USER_INFO_DATA_KEY = @"data";

@implementation ISN_UNMutableNotificationContent
-(id) init { return self = [super init]; }
-(UNNotificationContent* ) getNotificationContent {
    
    //Creating a content:
    UNMutableNotificationContent* content = [[UNMutableNotificationContent alloc] init];
    
    if(self.m_Body.length != 0) {
        content.body = self.m_Body;
    }
    
    if(self.m_Subtitle.length != 0) {
        content.subtitle = self.m_Subtitle;
    }
    
    if(self.m_Title.length != 0) {
        content.title = self.m_Title;
    }
    
    if(self.m_Badge != 0) {
        content.badge = [[NSNumber alloc] initWithLong:self.m_Badge];
    }
    
    if(self.m_Sound.length != 0) {
        if([self.m_Sound isEqualToString:DEFAULT_SOUND]) {
            content.sound = [UNNotificationSound defaultSound];
        } else {
            content.sound = [UNNotificationSound soundNamed:self.m_Sound];
        }
    }
    
    if(self.m_UserInfo.length != 0) {
        NSMutableDictionary *userInfo = [[NSMutableDictionary alloc] init];
        [userInfo setObject:self.m_UserInfo forKey:USER_INFO_DATA_KEY];
        content.userInfo = userInfo;
    }
    
    return content;
}

-(id) initWithContent:(UNNotificationContent *) content {
    self = [super init];
    if(self) {
        self.m_Body = content.body == NULL ? @"" : content.body;
        self.m_Subtitle = content.subtitle == NULL ? @"" : content.subtitle;
        self.m_Title = content.title == NULL ? @"" : content.title;
        self.m_Badge = (long) content.badge;
        self.m_Sound = @"";
        
        NSString *userInfo = [content.userInfo objectForKey:USER_INFO_DATA_KEY];
        self.m_UserInfo = userInfo == NULL ? @"" : userInfo;
    }
    
    return self;
}
@end

@implementation ISN_ISN_UNNotificationTrigger
-(id) init { return self = [super init]; }
-(id) initWithTrigger:(UNNotificationTrigger *) trigger {
    
    self = [super init];
    if(self) {
        if(trigger != NULL) {
            if([trigger isKindOfClass:[UNTimeIntervalNotificationTrigger class]]) {
                UNTimeIntervalNotificationTrigger *intervalTrigger = (UNTimeIntervalNotificationTrigger *)trigger;
                self.m_Type = ISN_UNNotificationTriggerTypeTimeInterval;
                self.m_TimeInterval = intervalTrigger.timeInterval;
                
                if(intervalTrigger.nextTriggerDate != NULL) {
                    NSDate * mydate = [[NSDate alloc] init];
                    NSTimeZone *zone = [NSTimeZone systemTimeZone];
                    NSInteger interval = [zone secondsFromGMTForDate:intervalTrigger.nextTriggerDate];
                    mydate = [mydate dateByAddingTimeInterval:interval];
                    self.m_NextTriggerDate = [mydate timeIntervalSince1970];
                } else {
                    self.m_NextTriggerDate = 0;
                }
            }
            
            if([trigger isKindOfClass:[UNCalendarNotificationTrigger class]]) {
                UNCalendarNotificationTrigger *calendarTrigger = (UNCalendarNotificationTrigger *)trigger;
                self.m_Type = ISN_UNNotificationTriggerTypeCalendar;
                self.m_DateComponents = [[ISN_NSDateComponents alloc] initWithNSDateComponents:calendarTrigger.dateComponents];
                
                if(calendarTrigger.nextTriggerDate != NULL) {
                    NSDate * mydate = [[NSDate alloc] init];
                    NSTimeZone *zone = [NSTimeZone systemTimeZone];
                    NSInteger interval = [zone secondsFromGMTForDate:calendarTrigger.nextTriggerDate];
                    mydate = [mydate dateByAddingTimeInterval:interval];
                    self.m_NextTriggerDate = [mydate timeIntervalSince1970];
                } else {
                    self.m_NextTriggerDate = 0;
                }
            }
            
            #ifdef CORE_LOCATION_API_ENABLED
            if([trigger isKindOfClass:[UNLocationNotificationTrigger class]]) {
                UNLocationNotificationTrigger *locationTrigger = (UNLocationNotificationTrigger *)trigger;
                self.m_Type = ISN_UNNotificationTriggerTypeLocation;
                
                
                if([locationTrigger.region isKindOfClass:[CLCircularRegion class]]) {
                    CLCircularRegion *region = (CLCircularRegion *)locationTrigger.region;
                    self.m_Region = [[ISN_CLCircularRegion alloc] initWithCLLocationCoordinate2D:region];
                }
                
            }
            #endif
            
            if([trigger isKindOfClass:[UNPushNotificationTrigger class]]) {
                self.m_Type = ISN_UNNotificationTriggerTypePushNotification;
            }
            
            
            
            self.m_Repeats = trigger.repeats;
        }
    }
    return self;
}

-(UNNotificationTrigger* ) getTrigger {
    UNNotificationTrigger* trigger = nil;
    switch (self.m_Type) {
        case ISN_UNNotificationTriggerTypeTimeInterval:
            
            if(self.m_TimeInterval != 0) {
                trigger = [UNTimeIntervalNotificationTrigger
                           triggerWithTimeInterval:self.m_TimeInterval
                           repeats:self.m_Repeats];
            }
            break;
            
        case ISN_UNNotificationTriggerTypeCalendar:
            trigger = [UNCalendarNotificationTrigger
                       triggerWithDateMatchingComponents:[self.m_DateComponents getNSDateComponents]
                       repeats:self.m_Repeats];
            break;
            
#ifdef CORE_LOCATION_API_ENABLED
        case ISN_UNNotificationTriggerTypeLocation:
            trigger = [UNLocationNotificationTrigger
                       triggerWithRegion:[self.m_Region getCLCircularRegion]
                       repeats:self.m_Repeats];
            break;
#endif
        case ISN_UNNotificationTriggerTypePushNotification:
            break;
    }
    
    return  trigger;
    
}



@end

@implementation ISN_UNNotificationRequest
-(id) init { return self = [super init]; }
-(id) initWithRequest:(UNNotificationRequest *) request {
    self = [super init];
    if(self) {
        self.m_Identifier = request.identifier;
        self.m_Content = [[ISN_UNMutableNotificationContent alloc] initWithContent:request.content];
        self.m_Trigger = [[ISN_ISN_UNNotificationTrigger alloc] initWithTrigger:request.trigger];
    }
    return self;
}

-(UNNotificationRequest*) getRequest {
    
    UNNotificationContent* content = [self.m_Content getNotificationContent];
    UNNotificationTrigger* trigger = [self.m_Trigger getTrigger];
    UNNotificationRequest* request = [UNNotificationRequest
                                      requestWithIdentifier:self.m_Identifier
                                      content:content
                                      trigger:trigger];
    
    return request;
}

@end

@implementation ISN_UNNotification
-(id) init { return self = [super init]; }
-(id) initWithUNNotification:(UNNotification *) notification {
    self = [super init];
    if(self) {
        if(notification.date != NULL) {
            NSDate * mydate = [[NSDate alloc] init];
            NSTimeZone *zone = [NSTimeZone systemTimeZone];
            NSInteger interval = [zone secondsFromGMTForDate:notification.date];
            mydate = [mydate dateByAddingTimeInterval:interval];
            self.m_Date = [mydate timeIntervalSince1970];
        } else {
            self.m_Date = 0;
        }
        
        self.m_Request =[[ISN_UNNotificationRequest alloc] initWithRequest:notification.request];
    }
    return self;
    
}
@end


@implementation ISN_UNNotificationResponse
-(id) init { return self = [super init]; }
-(id) initWithUNNotificationResponse:(UNNotificationResponse *) response {
    self = [super init];
    if(self) {
        self.m_ActionIdentifier = response.actionIdentifier;
        self.m_Notification = [[ISN_UNNotification alloc] initWithUNNotification:response.notification];
    }
    return self;
}

@end


@implementation ISN_UNNotifcationRequestsIds
-(id) init { return self = [super init]; }
@end

@implementation ISN_UNNotificationRequests
-(id) init { return self = [super init]; }
@end

@implementation ISN_UNNotifcations
-(id) init { return self = [super init]; }
@end


#endif
