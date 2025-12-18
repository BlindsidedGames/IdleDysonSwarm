#import <AVFoundation/AVFoundation.h>
#import "ISN_Foundation.h"

extern "C" {
    
    int _ISN_AV_GetAuthorizationStatus(int mediaType) {
        
        #if !TARGET_OS_TV
        AVMediaType type;
        
        switch (mediaType) {
            case 0:
                type = AVMediaTypeVideo;
                break;
            case 1:
                type = AVMediaTypeAudio;
                break;
            default:
                type = AVMediaTypeVideo;
                break;
        }
        
        AVAuthorizationStatus authStatus = [AVCaptureDevice authorizationStatusForMediaType:type];
        return (int) authStatus;
#else
        return 0;
#endif
    }
    
    
    void _ISN_AV_RequestAccessForMediaType(int mediaType) {
        
        #if !TARGET_OS_TV
        AVMediaType type;
        
        switch (mediaType) {
            case 0:
                type = AVMediaTypeVideo;
                break;
            case 1:
                type = AVMediaTypeAudio;
                break;
            default:
                type = AVMediaTypeVideo;
                break;
        }
        
        [AVCaptureDevice requestAccessForMediaType:type completionHandler:^(BOOL granted) {
            int authStatus = (int) [AVCaptureDevice authorizationStatusForMediaType:type];
            ISN_SendMessage(UNITY_AV_LISTENER, "OnRequestAccessCompleted", [NSString stringWithFormat:@"%d",authStatus]);
        }];
#endif
        
    }
    
   
    
    
}

