#import <Foundation/Foundation.h>
#import <GameKit/GameKit.h>
#import "ISN_GKCommunication.h"
#import "ISN_GKAchievementManager.h"


#ifdef __cplusplus
extern "C" {
#endif
    
    void _ISN_GKLeaderboard_LoadLeaderboards(UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKLeaderboar_LoadLeaderboards" data:""];
        
        [GKLeaderboard loadLeaderboardsWithCompletionHandler:^(NSArray<GKLeaderboard *> * _Nullable leaderboards, NSError * _Nullable error) {
            ISN_GKLeaderboardsResult *result;
            if (error == nil) {
                NSMutableArray<ISN_GKLeaderboard> *leaderboardsArray = [[NSMutableArray<ISN_GKLeaderboard> alloc] init];
                
                for (GKLeaderboard* leaderboard in leaderboards) {
                    ISN_GKLeaderboard *ldb = [[ISN_GKLeaderboard alloc] initWithGKLeaderboard:leaderboard];
                    [leaderboardsArray addObject:ldb];
                }
                result = [[ISN_GKLeaderboardsResult alloc] initWithGKLeaderboards:leaderboardsArray];
            } else {
                result = [[ISN_GKLeaderboardsResult alloc] initWithNSError:error];
            }

            ISN_SendCallbackToUnity(callback, [result toJSONString]);
        }];
    }
    
    void _ISN_GKLeaderboard_LoadScores(char* leaderboardJSON, UnityAction callback) {
         
         [ISN_Logger LogNativeMethodInvoke:"_ISN_GKLeaderboar_LoadScores" data:ISN_ConvertToChar([NSString stringWithFormat:@"contentJSON: %s", leaderboardJSON])];
         
         NSError *jsonError;
         ISN_GKLeaderboard *requestData = [[ISN_GKLeaderboard alloc] initWithChar:leaderboardJSON error:&jsonError];
         if (jsonError) {
             [ISN_Logger LogError:@"ISN_GKLeaderboard JSON parsing error: %@", jsonError.description];
         }

         GKLeaderboard *leaderboardRequest = [requestData toGKLeaderboard];
         [leaderboardRequest loadScoresWithCompletionHandler:^(NSArray<GKScore *> * _Nullable scores, NSError * _Nullable error) {
             ISN_GKScoreLoadResult * result;
             if(error != NULL) {
                 result = [[ISN_GKScoreLoadResult alloc] initWithNSError:error];
             } else {
                 result = [[ISN_GKScoreLoadResult alloc] init];
                 NSMutableArray<ISN_GKScore> *scoresArray = [[NSMutableArray<ISN_GKScore> alloc] init];
                 for (GKScore* score in scores) {
                     ISN_GKScore *isn_score = [[ISN_GKScore alloc] initWithGKScore:score];
                     [scoresArray addObject:isn_score];
                 }
                 
                 result.m_Scores = scoresArray;
                 result.m_Leaderboard = [[ISN_GKLeaderboard alloc] initWithGKLeaderboard:leaderboardRequest];
             }
             
             ISN_SendCallbackToUnity(callback, [result toJSONString]);
         }];
         
     }
    
    void _ISN_GKLeaderboard_ReportScore(char* scoresJSON, UnityAction callback) {
        
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GKLeaderboar_ReportScore" data:ISN_ConvertToChar([NSString stringWithFormat:@"contentJSON: %s", scoresJSON])];
        
        NSError *jsonError;
        ISN_GKScoreRequest *requestData = [[ISN_GKScoreRequest alloc] initWithChar:scoresJSON error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_GKLeaderboar_ReportScore JSON parsing error: %@", jsonError.description];
        }
        
        NSMutableArray<GKScore*> *scores = [[NSMutableArray<GKScore*> alloc] init];
        for(ISN_GKScore* score in requestData.m_Scores) {
            GKScore* gk_socre  = [score toGKScore];
            [scores addObject:gk_socre];
        }
        
        [GKScore reportScores:scores withCompletionHandler:^(NSError *error) {
            SA_Result* result = [[SA_Result alloc] initWithNSError:error];
            ISN_SendCallbackToUnity(callback, [result toJSONString]);
        }];
    }
    
#if __cplusplus
}   // Extern C
#endif
