#import "ISN_GKLocalPlayerListener.h"
#import "ISN_GKCommunication.h"
#import "ISN_Foundation.h"
#import "ISN_GKLocalPlayerManager.h"

@implementation ISN_GKLocalPlayerListener

  -(id) init { return self = [super init]; }
// GKSavedGameListener methods

  #if !TARGET_OS_TV

// Called when a player’s saved game data has been modified.
- (void)player:(GKPlayer *)player didModifySavedGame:(GKSavedGame *)savedGame {
    
    NSString *uniqueId = [[NSProcessInfo processInfo] globallyUniqueString];
    ISN_GKSavedGame *game = [[ISN_GKSavedGame alloc] initWithGKSavedGameWithId:savedGame withId:uniqueId];
    ISN_GKSavedGameSaveResult *result = [[ISN_GKSavedGameSaveResult alloc] initWithGKSavedGameData:game];
    [[ISN_GKLocalPlayerManager sharedInstance] cacheSavedGame:savedGame withId:uniqueId];
    
    ISN_SendCallbackToUnity([self didModifySavedGameCallback], [result toJSONString]);
}

// Called when a conflict has arisen between different versions of the same saved game. This can happen when multiple devices write to the same saved game while one or more is offline. The application should determine the correct data to use, then call resolveConflictingSavedGames:withData:completionHandler:. This may require data merging or asking the user.
- (void)player:(GKPlayer *)player hasConflictingSavedGames:(NSArray<GKSavedGame *> *)savedGames {
    NSMutableArray<ISN_GKSavedGame> *savedGamesArray = [[NSMutableArray<ISN_GKSavedGame> alloc] init];

    NSString *uniqueId;
    for (GKSavedGame *save in savedGames) {
        uniqueId = [[NSProcessInfo processInfo] globallyUniqueString];
        [[ISN_GKLocalPlayerManager sharedInstance] cacheSavedGame:save withId:uniqueId];
        
        ISN_GKSavedGame *game = [[ISN_GKSavedGame alloc] initWithGKSavedGameWithId:save withId:uniqueId];
        [savedGamesArray addObject:game];
    }
    
    ISN_GKSavedGameFetchResult *result = [[ISN_GKSavedGameFetchResult alloc] initWithSKSavedGamesArray:savedGamesArray];
    ISN_SendCallbackToUnity([self hasConflictingSavedGamesCallback], [result toJSONString]);
}
#endif

// GKChallengeListener methods

// GKInviteEventListener methods

// GKTurnBasedEventListener methods

@end
