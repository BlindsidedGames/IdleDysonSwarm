#import <Foundation/Foundation.h>
#import <GameKit/GameKit.h>
#import "ISN_Foundation.h"
#import "ISN_GKCommunication.h"



#ifdef __cplusplus
extern "C" {
#endif

    GKPlayer* ISN_GetPlayer(unsigned long key) {
        if(key == 1) {
            return  [GKLocalPlayer localPlayer];;
        }
        return (GKPlayer*) [ISN_HashStorage Get:key];
    }

    char* _ISN_GKPlayer_playerId (unsigned long playerKey) {
        GKPlayer* player = ISN_GetPlayer(playerKey);
        return ISN_ConvertToChar(player.playerID);
    }

    char* _ISN_GKPlayer_guestIdentifier (unsigned long playerKey) {
       GKPlayer* player = ISN_GetPlayer(playerKey);
       return player.guestIdentifier  == NULL ? ISN_ConvertToChar(@"") : ISN_ConvertToChar(player.guestIdentifier);
    }

    char* _ISN_GKPlayer_teamPlayerID (unsigned long playerKey) {
        GKPlayer* player = ISN_GetPlayer(playerKey);
        if (@available(iOS 12.4, *)) {
            return ISN_ConvertToChar(player.teamPlayerID);
        } else {
            return ISN_ConvertToChar(@"unavaliable-use-ios-12.4-or-newver");
        }
    }

    char* _ISN_GKPlayer_gamePlayerID (unsigned long playerKey) {
        GKPlayer* player = ISN_GetPlayer(playerKey);
        if (@available(iOS 12.4, *)) {
            return ISN_ConvertToChar(player.gamePlayerID);
        } else {
             return ISN_ConvertToChar(@"unavaliable-use-ios-12.4-or-newver");
        }
    }

    char* _ISN_GKPlayer_alias (unsigned long playerKey) {
        GKPlayer* player = ISN_GetPlayer(playerKey);
       return ISN_ConvertToChar(player.alias);
   }

   char* _ISN_GKPlayer_displayName (unsigned long playerKey) {
       GKPlayer* player = ISN_GetPlayer(playerKey);
       return ISN_ConvertToChar(player.displayName);
   }

    bool _ISN_GKPlayer_scopedIDsArePersistent (unsigned long playerKey) {
        GKPlayer* player = ISN_GetPlayer(playerKey);
        if (@available(iOS 13.0, *)) {
            return [player scopedIDsArePersistent];
        } else {
            return false;
        }
    }

    void _ISN_GKPlayer_LoadPhotoForSize(unsigned long playerKey, int size, UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKPlayer_LoadPhotoForSize" data:""];

       GKPlayer* player = ISN_GetPlayer(playerKey);
        GKPhotoSize photoSize;

        switch (size) {
            case 0:
                photoSize = GKPhotoSizeSmall;
                break;

            default:
                photoSize = GKPhotoSizeNormal;
                break;
        }

        [player loadPhotoForSize:photoSize withCompletionHandler:^(UIImage * _Nullable photo, NSError * _Nullable error) {

            ISN_GKLocalPlayerImageLoadResult* result;
            if(error == nil) {
                result.m_ImageBase64 = ISN_ConvertImageToBase64(photo);
            } else {
                result = [[ISN_GKLocalPlayerImageLoadResult alloc] initWithNSError:error];
            }

            ISN_SendCallbackToUnity(callback, [result toJSONString]);
        }];
    }


#if __cplusplus
}   // Extern C
#endif
