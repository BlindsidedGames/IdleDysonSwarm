//
//  ISN_ASAuthorizationAppleIDProvider.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-01-27.
//

#import "ISN_Foundation.h"

#import <Foundation/Foundation.h>
#import <AuthenticationServices/AuthenticationServices.h>


extern "C" {
    unsigned long _ISN_ASAuthorizationAppleIDProvider_init() {
        if (@available(iOS 13.0, *)) {
            return [ISN_HashStorage Add:[[ASAuthorizationAppleIDProvider alloc] init]];
        } else {
            return [ISN_HashStorage NullObjectHash];
        }
    }

void _ISN_ASAuthorizationAppleIDProvider_getCredentialStateForUserID(unsigned long hash, char* userID, UnityAction callback) {
    if (@available(iOS 13.0, *)) {
        ASAuthorizationAppleIDProvider* provider = (ASAuthorizationAppleIDProvider*) [ISN_HashStorage Get:hash];

        [provider getCredentialStateForUserID:[NSString stringWithUTF8String:userID] completion:^(ASAuthorizationAppleIDProviderCredentialState credentialState, NSError * _Nullable error) {
            if(error != NULL) {
                SA_Result* result = [[SA_Result alloc] initWithNSError:error];
                ISN_SendCallbackToUnity(callback, [result toJSONString]);
            } else {
                SA_Result* result = [[SA_Result alloc] init];
                int enumInt = credentialState;
                [result setData: @(enumInt).stringValue];
                ISN_SendCallbackToUnity(callback, [result toJSONString]);
            }
        }];
    }
}


    unsigned long _ISN_ASAuthorizationAppleIDProvider_createRequest(unsigned long hash) {
       if (@available(iOS 13.0, *)) {
           ASAuthorizationAppleIDProvider* provider = (ASAuthorizationAppleIDProvider*) [ISN_HashStorage Get:hash];
           return [ISN_HashStorage Add:[provider createRequest]];
       } else {
           return [ISN_HashStorage NullObjectHash];
       }
   }
}
