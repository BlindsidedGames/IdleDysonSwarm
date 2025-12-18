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

    void _ISN_ASAuthorizationOpenIDRequest_setRequestedScopes(unsigned long hash, char *scopes) {
        if (@available(iOS 13.0, *)) {
            ASAuthorizationOpenIDRequest* request = (ASAuthorizationOpenIDRequest*)  [ISN_HashStorage Get:hash];
            NSString* scopesString  = [NSString stringWithUTF8String: scopes];
            NSArray * scopesArray = [scopesString componentsSeparatedByString:@","];
            
            NSMutableArray *requestedScopes = [[NSMutableArray alloc] init];
            for (NSString* s in scopesArray) {
                if([s isEqual: @"Email"]) {
                    [requestedScopes addObject:ASAuthorizationScopeEmail];
                }
                
                if([s isEqual: @"FullName"]) {
                    [requestedScopes addObject:ASAuthorizationScopeFullName];
                }
            }
            [request setRequestedScopes:requestedScopes];
        } else {
            // Fallback on earlier versions
        }
    }
}
