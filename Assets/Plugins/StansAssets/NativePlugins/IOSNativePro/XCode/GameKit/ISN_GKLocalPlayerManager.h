#import <Foundation/Foundation.h>
#import <GameKit/GameKit.h>

@interface ISN_GKLocalPlayerManager : NSObject
+ (id)sharedInstance;
-(void) authenticateLocalPlayer:(UnityAction) callback didModifySavedGameCallback: (UnityAction) didModifySavedGameCallback hasConflictingSavedGamesCallback: (UnityAction) hasConflictingSavedGamesCallback;

#if !TARGET_OS_TV
- (void) fetchSavedGames:(UnityAction) callback;
- (void) saveGameData:(UnityAction) callback withName:(NSString *)name withData:(NSData *)data;
- (void) deleteSavedGame:(UnityAction) callback withName:(NSString *)name withUniqueId:(NSString *) uniqueId;
- (void) loadSaveData:(UnityAction)requestId withName:(NSString *)name withUniqueId:(NSString *) uniqueId;
- (void) cacheSavedGame:(GKSavedGame *)game withId:(NSString *)uniqueId;
- (void) resolveConflictingSavedGames:(UnityAction) callback withConflictedSavedGamesIds:(NSArray<NSString *> *)conflictedSavedGamesIds withData:(NSData*)data;
- (void) removeSavedGameFromCache:(NSString*) uniqueId;
- (GKSavedGame*) getCachedSavedGame:(NSString*) uniqueId;

#endif

@property (nonatomic) NSMutableDictionary* loadedSavedGames;
@property (nonatomic) ISN_GKLocalPlayerListener* playerListener;

@end
