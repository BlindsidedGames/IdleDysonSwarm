#import <Foundation/Foundation.h>
#import <GameKit/GameKit.h>
#import "ISN_Foundation.h"
#import "ISN_GKCommunication.h"
#import "ISN_GKLocalPlayerListener.h"
#import "ISN_GKLocalPlayerManager.h"
#import "ISN_Logger.h"

@implementation ISN_GKLocalPlayerManager
static ISN_GKLocalPlayerManager * s_sharedInstance;

+ (id)sharedInstance {
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    return s_sharedInstance;
}

-(id) init {
    self = [super init];
    if(self) {
        self.loadedSavedGames = [[NSMutableDictionary alloc] init];
    }
    return self;
}

-(void) authenticateLocalPlayer:(UnityAction) callback
     didModifySavedGameCallback: (UnityAction) didModifySavedGameCallback
     hasConflictingSavedGamesCallback: (UnityAction) hasConflictingSavedGamesCallback
{
    
    NSLog(@"native authenticateLocalPlayer called-2--");
    
    [[GKLocalPlayer localPlayer] setAuthenticateHandler:^(UIViewController * _Nullable viewController, NSError * _Nullable error) {
        
          NSLog(@"Got CB");
        
        if(viewController) {//Show login if player is not logged in
            UIViewController *vc =  UnityGetGLViewController();
            [vc presentViewController:viewController animated:YES completion:nil];
            return;
        }
        
        SA_Result *result;
        if(error != nil) {
            result = [[SA_Result alloc] initWithNSError:error];
            ISN_SendCallbackToUnity(callback, [result toJSONString]);
            return;
        }
        
        if ([GKLocalPlayer localPlayer].isAuthenticated) {
             NSLog(@"GK Player is already authenticated");
            
            //Player is already authenticated & logged in, load game center
            self.playerListener = [[ISN_GKLocalPlayerListener alloc] init];
            [self.playerListener setDidModifySavedGameCallback:didModifySavedGameCallback];
            [self.playerListener setHasConflictingSavedGamesCallback: hasConflictingSavedGamesCallback];
            
            GKLocalPlayer* localPlayer = [GKLocalPlayer localPlayer];
            [localPlayer registerListener:self.playerListener];
            result = [[SA_Result alloc] init];
        } else {
             NSLog(@"Game center is not enabled");
            SA_Error *sa_error = [[SA_Error alloc] initWithCode:1 message:@"Game center is not enabled on the user device!"];
            result = [[SA_Result alloc] initWithError:sa_error];
        }
        
        ISN_SendCallbackToUnity(callback, [result toJSONString]);
    }];

}

#if !TARGET_OS_TV

- (void) cacheSavedGame:(GKSavedGame *)game withId:(NSString *)uniqueId {
    NSLog(@"CacheSavedGame uniqueId:  %@", uniqueId);
    [[self loadedSavedGames] setObject:game forKey:uniqueId];
}

- (GKSavedGame*) getCachedSavedGame:(NSString*) uniqueId {
    return [[self loadedSavedGames] objectForKey:uniqueId];
}

- (void) removeSavedGameFromCache:(NSString*) uniqueId {
    NSLog(@"getCachedSavedGame uniqueId: %@", uniqueId);
    [[self loadedSavedGames] removeObjectForKey:uniqueId];
}

-(void) fetchSavedGames:(UnityAction) callback {
    [[GKLocalPlayer localPlayer] fetchSavedGamesWithCompletionHandler:^(NSArray<GKSavedGame *> * _Nullable savedGames, NSError * _Nullable error) {
        ISN_GKSavedGameFetchResult *result;
        if(error == NULL) {
            NSMutableArray<ISN_GKSavedGame> *savedGamesArray = [[NSMutableArray<ISN_GKSavedGame> alloc] init];
            
            NSString *uniqueId;
            for (GKSavedGame *save in savedGames) {
                uniqueId = [[NSProcessInfo processInfo] globallyUniqueString];
                [self cacheSavedGame:save withId:uniqueId];
                
                ISN_GKSavedGame *game = [[ISN_GKSavedGame alloc] initWithGKSavedGameWithId:save withId:(uniqueId)];
                [savedGamesArray addObject:game];
                
            }
            
            result = [[ISN_GKSavedGameFetchResult alloc] initWithSKSavedGamesArray:savedGamesArray];
        } else {
            result = [[ISN_GKSavedGameFetchResult alloc] initWithNSError:error];
        }
        
        ISN_SendCallbackToUnity(callback, [result toJSONString]);
    }];
}

-(void) saveGameData:(UnityAction) callback withName:(NSString *)name withData:(NSData *)data {
    [[GKLocalPlayer localPlayer] saveGameData:data withName:name completionHandler:^(GKSavedGame * _Nullable savedGame, NSError * _Nullable error) {
        ISN_GKSavedGameSaveResult *result;
        if(error == NULL) {
            
            NSString *uniqueId = [[NSProcessInfo processInfo] globallyUniqueString];
            [self cacheSavedGame:savedGame withId:uniqueId];
            ISN_GKSavedGame *game = [[ISN_GKSavedGame alloc] initWithGKSavedGameWithId:savedGame withId:(uniqueId)];
            result = [[ISN_GKSavedGameSaveResult alloc] initWithGKSavedGameData:game];
        } else {
            result = [[ISN_GKSavedGameSaveResult alloc] initWithNSError:error];
        }
        
        ISN_SendCallbackToUnity(callback, [result toJSONString]);
    }];
}

- (void) deleteSavedGame:(UnityAction) callback withName:(NSString *)name withUniqueId:(NSString *) uniqueId {
    [[GKLocalPlayer localPlayer] deleteSavedGamesWithName:name completionHandler:^(NSError * _Nullable error) {
        SA_Result *result;
        if(error == NULL) {
            [self removeSavedGameFromCache:uniqueId];
            result = [[SA_Result alloc] init];
        } else {
            result = [[SA_Result alloc] initWithNSError:error];
        }
        
        ISN_SendCallbackToUnity(callback, [result toJSONString]);
    }];
}

- (void) loadSaveData:(UnityAction) callback withName:(NSString *)name withUniqueId:(NSString *) uniqueId {
    NSLog(@"LoadSaveData uniqueId:  %@", uniqueId);
    GKSavedGame *save = [self getCachedSavedGame:uniqueId];
    if(save != NULL) {
        [save loadDataWithCompletionHandler:^(NSData * _Nullable data, NSError * _Nullable error) {
            
            ISN_GKSavedGameLoadResult *result;
            if(error == NULL) {
                result = [[ISN_GKSavedGameLoadResult alloc] initWithGKLoadData:[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]];
            } else {
                result = [[ISN_GKSavedGameLoadResult alloc] initWithNSError:error];
            }
            
            ISN_SendCallbackToUnity(callback, [result toJSONString]);
        }];
    } else {
        SA_Error *sa_error = [[SA_Error alloc] initWithCode:999 message:@"Saved game not found. Check the game's name of fetch saved games before using this method, please!"];
        ISN_GKSavedGameLoadResult *result = [[ISN_GKSavedGameLoadResult alloc] initWithError:sa_error];
        
        ISN_SendCallbackToUnity(callback, [result toJSONString]);
    }
}

-(void) resolveConflictingSavedGames:(UnityAction) callback withConflictedSavedGamesIds:(NSArray<NSString *> *)conflictedSavedGamesIds withData:(NSData*)data {
     NSMutableArray <GKSavedGame *> * conflicts = [[NSMutableArray alloc] init];
     for (NSString *uniqueId in conflictedSavedGamesIds) {
         GKSavedGame *save = [self getCachedSavedGame:uniqueId];
         if(save != nil) {
             [conflicts addObject:save];
         }
     }
    
     [[GKLocalPlayer localPlayer] resolveConflictingSavedGames:conflicts withData:data completionHandler:^(NSArray<GKSavedGame *> * _Nullable savedGames, NSError * _Nullable error) {
         ISN_GKSavedGameFetchResult *result;
         if(error == NULL) {
             NSMutableArray<ISN_GKSavedGame> *savedGamesArray = [[NSMutableArray<ISN_GKSavedGame> alloc] init];
             
             NSString *uniqueId;
             for (GKSavedGame *save in savedGames) {
                 uniqueId = [[NSProcessInfo processInfo] globallyUniqueString];
                 [[ISN_GKLocalPlayerManager sharedInstance] cacheSavedGame:save withId:uniqueId];
                 
                 ISN_GKSavedGame *game = [[ISN_GKSavedGame alloc] initWithGKSavedGameWithId:save withId:uniqueId];
                 [savedGamesArray addObject:game];
             }
             
             result = [[ISN_GKSavedGameFetchResult alloc] initWithSKSavedGamesArray:savedGamesArray];
         } else {
             result = [[ISN_GKSavedGameFetchResult alloc] initWithNSError:error];
         }
         
         ISN_SendCallbackToUnity(callback, [result toJSONString]);
     }];
 }

#endif

@end


#ifdef __cplusplus
extern "C" {
#endif
    
    void _ISN_AuthenticateLocalPlayer (UnityAction callback, UnityAction didModifySavedGameCallback, UnityAction hasConflictingSavedGamesCallback)  {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_AuthenticateLocalPlayer" data:""];
        [[ISN_GKLocalPlayerManager sharedInstance] authenticateLocalPlayer:callback didModifySavedGameCallback:didModifySavedGameCallback hasConflictingSavedGamesCallback:hasConflictingSavedGamesCallback];
    }
    
    
    void _ISN_GKLocalPlayer_FetchSavedGames(UnityAction callback) {
#if !TARGET_OS_TV
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKLocalPlayer_FetchSavedGames" data:""];
        [[ISN_GKLocalPlayerManager sharedInstance] fetchSavedGames:callback];
#endif
    }
    
    void _ISN_GKLocalPlayer_SaveGameData(char* name, char* data, UnityAction callback) {
#if !TARGET_OS_TV
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKLocalPlayer_SaveGameData" data:ISN_ConvertToChar([NSString stringWithFormat:@"name: %s data: %s: ", name, data])];

        NSString* m_name = ISN_ConvertToString(name);
        NSString* m_dataString = ISN_ConvertToString(data);
        NSData *m_data = [m_dataString dataUsingEncoding:NSUTF8StringEncoding];
        
        [[ISN_GKLocalPlayerManager sharedInstance] saveGameData:callback withName:m_name withData:m_data];
#endif
    }
    
    void _ISN_GKLocalPlayer_DeleteSavedGame(char* name, char* uniqueId, UnityAction callback) {
#if !TARGET_OS_TV
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKLocalPlayer_DeleteSavedGame" data:ISN_ConvertToChar([NSString stringWithFormat:@"name: %s uniqueId: %s: ", name, uniqueId])];
        
        [[ISN_GKLocalPlayerManager sharedInstance] deleteSavedGame:callback withName:ISN_ConvertToString(name) withUniqueId:ISN_ConvertToString(uniqueId)];
#endif
    }
    
    void _ISN_GKLocalPlayer_LoadGameData(char* name, char* uniqueId, UnityAction callback) {
#if !TARGET_OS_TV
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKLocalPlayer_LoadGameData" data:ISN_ConvertToChar([NSString stringWithFormat:@"name: %s uniqueId: %s", name, uniqueId])];
        
        [[ISN_GKLocalPlayerManager sharedInstance] loadSaveData:callback withName:ISN_ConvertToString(name) withUniqueId:ISN_ConvertToString(uniqueId)];
#endif
    }
    
    void _ISN_GKLocalPlayer_ResolveSavedGames(char* jsonContent, UnityAction callback) {
#if !TARGET_OS_TV
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKLocalPlayer_ResolveSavedGames" data:ISN_ConvertToChar([NSString stringWithFormat:@"contentJSON: %s", jsonContent])];
        
        NSError *jsonError;
        ISN_GKResolveSavedGamesRequest *requestData = [[ISN_GKResolveSavedGamesRequest alloc] initWithChar:jsonContent error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"ISN_GKResolveSavedGamesRequest JSON parsing error: %@", jsonError.description];
        }
        
        NSData *m_data = [requestData.m_Data dataUsingEncoding:NSUTF8StringEncoding];
        [[ISN_GKLocalPlayerManager sharedInstance] resolveConflictingSavedGames:callback withConflictedSavedGamesIds:requestData.m_ConflictedGames withData:m_data];
#endif
    }
    
    void GenerateIdentityVerificationSignatureHandle(NSURL *publicKeyUrl, NSData *signature, NSData *salt, uint64_t timestamp, NSError *error, UnityAction callback) {
        ISN_GKIdentityVerificationSignatureResult* result;
        if(error != NULL) {
            result = [[ISN_GKIdentityVerificationSignatureResult alloc] initWithNSError:error];
        } else {
            result = [[ISN_GKIdentityVerificationSignatureResult alloc] init];
            
            NSLog(@"generateIdentityVerificationSignatureWithCompletionHandler");
            NSLog(@"timestamp: %llu", timestamp);
        
            [result setM_Salt:[salt base64EncodedStringWithOptions:NSDataBase64DecodingIgnoreUnknownCharacters]];
            [result setM_Signature:[signature base64EncodedStringWithOptions:NSDataBase64DecodingIgnoreUnknownCharacters]];
            [result setM_PublicKeyUrl:publicKeyUrl.absoluteString];
            [result setM_Timestamp:timestamp];
        }
        ISN_SendCallbackToUnity(callback, [result toJSONString]);
    }

    void  _ISN_GKLocalPlayer_GenerateIdentityVerificationSignatureWithCompletionHandler(UnityAction callback) {
    #if !TARGET_OS_TV
        GKLocalPlayer *localPlayer =  [GKLocalPlayer localPlayer];
        if (@available(iOS 13.5, *)) {
            [localPlayer fetchItemsForIdentityVerificationSignature:^(NSURL *publicKeyUrl, NSData *signature, NSData *salt, uint64_t timestamp, NSError *error) {
                GenerateIdentityVerificationSignatureHandle(publicKeyUrl, signature, salt, timestamp, error, callback);
            }];
        } else {
            [localPlayer generateIdentityVerificationSignatureWithCompletionHandler:^(NSURL *publicKeyUrl, NSData *signature, NSData *salt, uint64_t timestamp, NSError *error) {
                GenerateIdentityVerificationSignatureHandle(publicKeyUrl, signature, salt, timestamp, error, callback);
            }];
        }
    #endif
    }
    
#if __cplusplus
}   // Extern C
#endif


