#import <Foundation/Foundation.h>
#import <GameKit/GameKit.h>
#import "ISN_GKCommunication.h"
#import "ISN_GKAchievementManager.h"

@implementation ISN_GKAchievementManager

static ISN_GKAchievementManager * s_sharedInstance;

+ (id)sharedInstance {
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    return s_sharedInstance;
}

-(id) init {
    return [super init];
}


-(void) reportAchievements:(UnityAction) callback withAchievementsArray:(NSArray<ISN_GKAchievement> *) achievementsArray {
    
    NSMutableArray<GKAchievement*> *reportAchievementsList =  [[NSMutableArray<GKAchievement*> alloc] init];
    
    for (ISN_GKAchievement* achievement in achievementsArray) {
      
        GKAchievement* achieve = [[GKAchievement alloc] initWithIdentifier:achievement.m_Identifier];
        achieve.percentComplete = achievement.m_PercentComplete;
        if(achieve.percentComplete >= 100.0) {
            achieve.percentComplete = 100.0;
            achieve.showsCompletionBanner = true;
        }
        
        [reportAchievementsList addObject:achieve];
    }
    
    [GKAchievement reportAchievements:reportAchievementsList withCompletionHandler:^(NSError * _Nullable error) {
        SA_Result *result;
        if(error == NULL) {
            result = [[SA_Result alloc] init];
        } else {
            result = [[SA_Result alloc] initWithNSError:error];
        }
        
        ISN_SendCallbackToUnity(callback, [result toJSONString]);
    }];
}

- (void) loadAchievements:(UnityAction) callback {
     [GKAchievement loadAchievementsWithCompletionHandler:^(NSArray *achievements, NSError *error) {
         ISN_GKAchievementsResult *result;
         if (error == nil) {
              NSMutableArray<ISN_GKAchievement> *achievementsArray = [[NSMutableArray<ISN_GKAchievement> alloc] init];
             
             for (GKAchievement* achievement in achievements) {
                 ISN_GKAchievement *achiev = [[ISN_GKAchievement alloc] initWithGKAchievementData:achievement];
                 [achievementsArray addObject:achiev];
             }
             result = [[ISN_GKAchievementsResult alloc] initWithGKAchievementsData:achievementsArray];
         } else {
             result = [[ISN_GKAchievementsResult alloc] initWithNSError:error];
         }
         
         ISN_SendCallbackToUnity(callback, [result toJSONString]);
     }];
 }

-(void) resetAchievements:(UnityAction) callback {
     [GKAchievement resetAchievementsWithCompletionHandler: ^(NSError *error)  { 
         SA_Result *result;
         if (error == nil) {
             result = [[SA_Result alloc] init];
         } else {
             result = [[SA_Result alloc] initWithNSError:error];
         }
         
         ISN_SendCallbackToUnity(callback, [result toJSONString]);
     }];
}

@end

#ifdef __cplusplus
extern "C" {
#endif
    
    void _ISN_GKAchievement_LoadAchievements(UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKAchievement_LoadAchievements" data:""];
        [[ISN_GKAchievementManager sharedInstance] loadAchievements:callback];
    }
    
    void _ISN_GKAchievement_ResetAchievements(UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKAchievement_ResetAchievements" data:""];
        [[ISN_GKAchievementManager sharedInstance] resetAchievements:callback];
    }
    
    void _ISN_GKAchievement_ReportAchievements(char* contentJSON, UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKAchievement_ReportAchievements" data:ISN_ConvertToChar([NSString stringWithFormat:@"contentJSON: %s", contentJSON])];
        
        NSError *jsonError;
        ISN_GKAchievementsResult *requestData = [[ISN_GKAchievementsResult alloc] initWithChar:contentJSON error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"ISN_GKAchievementsResult JSON parsing error: %@", jsonError.description];
        }
        
        [[ISN_GKAchievementManager sharedInstance] reportAchievements:callback withAchievementsArray:requestData.m_Achievements];
    }
    
#if __cplusplus
}   // Extern C
#endif
