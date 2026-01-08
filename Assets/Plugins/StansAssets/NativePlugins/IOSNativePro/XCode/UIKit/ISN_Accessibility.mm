//
//  ISN_Accessibility.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2019-08-21.
//

#import "ISN_Foundation.h"
#import <Foundation/Foundation.h>


extern "C" {
    
    bool _ISN_IsGuidedAccessEnabled() {
        return UIAccessibilityIsGuidedAccessEnabled;
    }
    
    void _ISN_RequestGuidedAccessSession(bool enable, UnityAction callback) {
        UIAccessibilityRequestGuidedAccessSession(enable, ^(BOOL didSucceed) {
            if(didSucceed) {
                SA_Result* result = [[SA_Result alloc] init];
                ISN_SendCallbackToUnity(callback, [result toJSONString]);
            } else {
                SA_Error *error = [[SA_Error alloc] initWithCode:1 message:@"failed"];
                SA_Result* result = [[SA_Result alloc] initWithError:error];
                ISN_SendCallbackToUnity(callback, [result toJSONString]);
            }
        });
    }
}
