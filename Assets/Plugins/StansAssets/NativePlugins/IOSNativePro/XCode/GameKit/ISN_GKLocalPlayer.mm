//
//  ISN_GKLocalPlayer.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-04-18.
//

#import <GameKit/GameKit.h>
#import <Foundation/Foundation.h>
#import "ISN_Foundation.h"

extern "C" {

    bool _ISN_GKLocalPlayer_isAuthenticated() {
        return [[GKLocalPlayer localPlayer] isAuthenticated];
    }

    bool _ISN_GKLocalPlayer_isUnderage() {
       return [[GKLocalPlayer localPlayer] isUnderage];
    }

    void _ISN_GK_SetDefaultLeaderboardIdentifier(char* identifier, UnityAction callback)
    {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GK_SetDefaultLeaderboardIdentifier" data:identifier];
    
        [[GKLocalPlayer localPlayer] setDefaultLeaderboardIdentifier:[NSString stringWithUTF8String: identifier] completionHandler:^(NSError * _Nullable error) {
            SA_Result* result = [[SA_Result alloc] initWithNSError:error];
            ISN_SendCallbackToUnity(callback, [result toJSONString]);
        }];
    }

    void _ISN_GK_LoadDefaultLeaderboardIdentifierWithCompletionHandler(UnityAction callback)
    {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GK_LoadDefaultLeaderboardIdentifierWithCompletionHandler" data:""];
        [[GKLocalPlayer localPlayer] loadDefaultLeaderboardIdentifierWithCompletionHandler:^(NSString * _Nullable leaderboardIdentifier, NSError * _Nullable error) {
            SA_Result* result = [[SA_Result alloc] initWithNSError:error];
            if(error == nil && leaderboardIdentifier != nil) {
                [result setData:leaderboardIdentifier];
            }
            ISN_SendCallbackToUnity(callback, [result toJSONString]);
        }];
    }
}
