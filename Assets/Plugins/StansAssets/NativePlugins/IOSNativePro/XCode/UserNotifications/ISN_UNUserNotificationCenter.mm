#if !TARGET_OS_TV

#import <Foundation/Foundation.h>
#import <UserNotifications/UserNotifications.h>
#import "ISN_Foundation.h"
#import "ISN_UNCommunication.h"
#import "ISN_NSCommunication.h"
#import "ISN_UNUserNotificationCenter.h"




@implementation ISN_UNUserNotificationCenter

static ISN_UNUserNotificationCenter * s_sharedInstance;
+ (id)sharedInstance {
    
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    return s_sharedInstance;
}

-(id) init {
    self = [super init];
    if(self) {
        self.m_userNotificationDelegate = [[ISN_UNUserNotificationCenterDelegate alloc] init];
    }
    
    return self;
}


-(void) addDelegate {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    center.delegate = self.m_userNotificationDelegate;
}

@end

extern "C" {
    

    void _ISN_UN_RequestAuthorization(int options) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UN_RequestAuthorization" data:ISN_ConvertToChar([NSString stringWithFormat:@"options: %d", options])];
        
        NSDateComponents* date = [[NSDateComponents alloc] init];
        date.hour = 8;
        date.minute = 30;
       
        
        UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
        [center requestAuthorizationWithOptions:options completionHandler:^(BOOL granted, NSError * _Nullable error) {
            SA_Result *result = [[SA_Result alloc] initWithNSError:error];
            ISN_SendMessage(UNITY_UN_LISTENER, "OnRequestAuthorization", [result toJSONString]);
        }];
    }
    
    
    void _ISN_UN_GetNotificationSettings() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UN_GetNotificationSettings" data:""];

        UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
        [center getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings * _Nonnull settings) {
            ISN_UNNotificationSettings *result = [[ISN_UNNotificationSettings alloc] initWithSettings:settings];
            ISN_SendMessage(UNITY_UN_LISTENER, "OnGetNotificationSettings", [result toJSONString]);
        }];
    }
    
    void _ISN_UN_RemoveAllPendingNotificationRequests() {
         [ISN_Logger LogNativeMethodInvoke:"_ISN_UN_RemoveAllPendingNotificationRequests" data:""];

         UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
         [center removeAllPendingNotificationRequests];
    }
    
    void _ISN_UN_RemovePendingNotificationRequests(char *contentJSON) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UN_RemovePendingNotificationRequests" data:contentJSON];
        
        NSError *jsonError;
        ISN_UNNotifcationRequestsIds *requestData = [[ISN_UNNotifcationRequestsIds alloc] initWithChar:contentJSON error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_UN_AddNotificationRequest JSON parsing error: %@", jsonError.description];
        }
        
        UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
        [center removePendingNotificationRequestsWithIdentifiers:requestData.m_NotificationIds];
    }
    
    
    void _ISN_UN_GetPendingNotificationRequests() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UN_GetPendingNotificationRequests" data:""];

        UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
        [center getPendingNotificationRequestsWithCompletionHandler:^(NSArray<UNNotificationRequest *> * _Nonnull requests) {
            ISN_UNNotificationRequests * result  = [[ISN_UNNotificationRequests alloc] init];
            
            NSMutableArray <ISN_UNNotificationRequest> *notifications = [[NSMutableArray<ISN_UNNotificationRequest> alloc] init];
            
            for (UNNotificationRequest *request in requests) {
                ISN_UNNotificationRequest* notification = [[ISN_UNNotificationRequest alloc] initWithRequest:request];
                [notifications addObject:notification];
            }
            
            result.m_Requests = notifications;
            
            ISN_SendMessage(UNITY_UN_LISTENER, "OnGetPendingNotificationRequests", [result toJSONString]);
           
        }];
        
        [[UIApplication sharedApplication] registerForRemoteNotifications];
    }
    
    
    void _ISN_UN_RemoveAllDeliveredNotifications() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UN_RemoveAllDeliveredNotifications" data:""];

        UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
        [center removeAllDeliveredNotifications];
    }
    
    void _ISN_UN_RemoveDeliveredNotifications(char *contentJSON) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UN_RemoveDeliveredNotifications" data:contentJSON];
        
        NSError *jsonError;
        ISN_UNNotifcationRequestsIds *requestData = [[ISN_UNNotifcationRequestsIds alloc] initWithChar:contentJSON error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_UN_AddNotificationRequest JSON parsing error: %@", jsonError.description];
        }
        
        UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
        [center removeDeliveredNotificationsWithIdentifiers:requestData.m_NotificationIds];
    }
    
    
    void _ISN_UN_GetDeliveredNotifications() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UN_GetDeliveredNotifications" data:""];

        UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
        
        [center getDeliveredNotificationsWithCompletionHandler:^(NSArray<UNNotification *> * _Nonnull notifications) {
            ISN_UNNotifcations * result  = [[ISN_UNNotifcations alloc] init];
            
            NSMutableArray <ISN_UNNotification> *isn_notifications = [[NSMutableArray<ISN_UNNotification> alloc] init];
            
            for (UNNotification *notification in notifications) {
                ISN_UNNotification* isn_notification = [[ISN_UNNotification alloc] initWithUNNotification:notification];
                [isn_notifications addObject:isn_notification];
            }
            
            result.m_Notifications = isn_notifications;
            ISN_SendMessage(UNITY_UN_LISTENER, "OnGetDeliveredNotifications", [result toJSONString]);
        }];
        
    }
    
    
    char* _ISN_UN_GetLastReceivedResponse() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UN_GetDeliveredNotifications" data:""];

        ISN_UNNotificationResponse* responce = [[ISN_UNUserNotificationCenter  sharedInstance] m_userNotificationDelegate].m_lastReceivedResponse;
        
        if(responce == NULL) {
            return ISN_ConvertToChar(@"");
        } else {
            return ISN_ConvertToChar([responce toJSONString]);
        }
        
    }
    
    void _ISN_UN_ClearLastReceivedResponse() {
        [[ISN_UNUserNotificationCenter  sharedInstance] m_userNotificationDelegate].m_lastReceivedResponse = NULL;
    }
    
    void _ISN_UN_AddNotificationRequest(char *contentJSON) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UN_AddNotificationRequest" data:contentJSON];
        
        NSError *jsonError;
        ISN_UNNotificationRequest *requestData = [[ISN_UNNotificationRequest alloc] initWithChar:contentJSON error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_UN_AddNotificationRequest JSON parsing error: %@", jsonError.description];
        }
        
        
        //Creating a request
        UNNotificationRequest* request = [requestData getRequest];
        
        // Schedule the notification.
        UNUserNotificationCenter* center = [UNUserNotificationCenter currentNotificationCenter];
        [center addNotificationRequest:request withCompletionHandler:^(NSError * _Nullable error) {
            SA_Result *result;
            if(error == NULL) {
                result = [[SA_Result  alloc] init];
            } else {
                result = [[SA_Result alloc] initWithNSError:error];
            }
            ISN_SendMessage(UNITY_UN_LISTENER, "OnAddNotificationRequest", [result toJSONString]);
        }];
       
        
    }
    
    
    
   
}

#endif

