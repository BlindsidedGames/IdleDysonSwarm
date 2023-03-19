#import <Foundation/Foundation.h>
#import <GameKit/GameKit.h>
#import "ISN_Foundation.h"

@interface ISN_GKLocalPlayerListener : NSObject<GKLocalPlayerListener>
@property(nonatomic) UnityAction didModifySavedGameCallback;
@property(nonatomic) UnityAction hasConflictingSavedGamesCallback;
@end

