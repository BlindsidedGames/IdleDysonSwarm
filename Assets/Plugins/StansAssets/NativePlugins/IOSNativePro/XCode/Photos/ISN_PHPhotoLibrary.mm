#import <Photos/Photos.h>
#import "ISN_Foundation.h"

extern "C" {

    int _ISN_PH_GetAuthorizationStatus() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_PH_GetAuthorizationStatus" data:""];
        PHAuthorizationStatus authStatus = [PHPhotoLibrary authorizationStatus];
        return (int) authStatus;
    }


    void _ISN_PH_RequestAuthorization(UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_PH_RequestAuthorization" data:""];
        [PHPhotoLibrary requestAuthorization:^(PHAuthorizationStatus status) {
            ISN_SendCallbackToUnity(callback, [NSString stringWithFormat:@"%li",(long)status]);
        }];
    }
}
