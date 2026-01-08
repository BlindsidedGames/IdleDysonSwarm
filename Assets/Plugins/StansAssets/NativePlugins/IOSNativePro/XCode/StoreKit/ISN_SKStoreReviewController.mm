#import <StoreKit/StoreKit.h>
#import "ISN_Foundation.h"

extern "C" {
    
    void _ISN_StoreRequestReview() {
#if  !TARGET_OS_TV
        [ISN_Logger LogNativeMethodInvoke:"_ISN_StoreRequestReview" data:""];

        if([SKStoreReviewController class]) {
            [SKStoreReviewController requestReview] ;
        }
#endif
    }
}
