#import "ISN_Foundation.h"

#import <Foundation/Foundation.h>
#import <AuthenticationServices/AuthenticationServices.h>


extern "C" {
    unsigned long ISN_ASAuthorizationPasswordProvider_init() {
        if (@available(iOS 13.0, *)) {
            return [ISN_HashStorage Add:[[ASAuthorizationPasswordProvider alloc] init]];
        } else {
            return [ISN_HashStorage NullObjectHash];
        }
    }


    unsigned long ISN_ASAuthorizationPasswordProvider_createRequest(unsigned long hash) {
       if (@available(iOS 13.0, *)) {
           ASAuthorizationPasswordProvider* provider = (ASAuthorizationPasswordProvider*) [ISN_HashStorage Get:hash];
           return [ISN_HashStorage Add:[provider createRequest]];
       } else {
           return [ISN_HashStorage NullObjectHash];
       }
   }
}
