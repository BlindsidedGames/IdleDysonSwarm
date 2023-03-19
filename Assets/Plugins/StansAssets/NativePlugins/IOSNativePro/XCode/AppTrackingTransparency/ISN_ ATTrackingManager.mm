#if !TARGET_OS_TV

#import <Foundation/Foundation.h>
#import <AppTrackingTransparency/AppTrackingTransparency.h>

#import "ISN_Foundation.h"
#import "ISN_UICommunication.h"



extern "C" {

    void _ISN_ATTrackingManager_RequestTrackingAuthorizationWithCompletionHandler(UnityAction callback) {
       
        [ISN_Logger LogNativeMethodInvoke:"_ISN_ATTrackingManager_RequestTrackingAuthorizationWithCompletionHandler" data:""];
        
        if (@available(iOS 14, *)) {
            [ATTrackingManager requestTrackingAuthorizationWithCompletionHandler:^(ATTrackingManagerAuthorizationStatus status) {
                ISN_SendCallbackToUnity(callback, [NSString stringWithFormat:@"%lu", (unsigned long)status]);
            }];
        } 
    }
    
    
    int _ISN_ATTrackingManager_TrackingAuthorizationStatus() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_ATTrackingManager_TrackingAuthorizationStatus" data:""];
        
        if (@available(iOS 14, *)) {
            return (int) [ATTrackingManager trackingAuthorizationStatus];
        } else {
            return 0;
        }
    }

}
 

#endif
