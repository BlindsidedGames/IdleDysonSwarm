#import <Foundation/Foundation.h>
#import <GameKit/GameKit.h>


@interface ISN_GKAchievementManager : NSObject

+ (id)sharedInstance;

- (void) loadAchievements:(UnityAction) callback;
- (void) resetAchievements:(UnityAction) callback;
- (void) reportAchievements:(UnityAction) callback withAchievementsArray:(NSArray<ISN_GKAchievement> *) achievementsArray;

@end
