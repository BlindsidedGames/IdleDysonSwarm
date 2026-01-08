#import <Foundation/Foundation.h>
#import "ISN_GKCommunication.h"


@implementation ISN_GKLocalPlayerImageLoadResult
 -(id) init { return self = [super init]; }
@end

@implementation ISN_GKGameCenterViewControllerShowResult
    -(id) init {  return self = [super init]; }
@end

#if !TARGET_OS_TV

@implementation ISN_GKSavedGame
    -(id) init { return self = [super init]; }
    -(id) initWithGKSavedGameWithId:(GKSavedGame *) savedGame withId:(NSString *)gameId {
        self = [super init];
        if(self) {
            self.m_DeviceName       = savedGame.deviceName  == NULL ? @"" : savedGame.deviceName;
            self.m_Name             = savedGame.name        == NULL ? @"" : savedGame.name;
            
            if(savedGame.modificationDate != NULL) {
                self.m_ModificationDate = [savedGame.modificationDate timeIntervalSince1970];
            } else {
                self.m_ModificationDate = 0;
            }
            self.m_Id = gameId;
        }
        return self;
    }
@end

@implementation ISN_GKSavedGameFetchResult
-(id) init { return self = [super init]; }
-(id) initWithSKSavedGamesArray:(NSArray<ISN_GKSavedGame> *) array{
    self = [super init];
    if(self) {
        self.m_SavedGames = array;
    }
    return  self;
}
@end

@implementation ISN_GKSavedGameSaveResult
    -(id) init { return self = [super init]; }
    -(id) initWithGKSavedGameData:(ISN_GKSavedGame *) savedGame {
        self = [super init];
        if(self) {
            self.m_SavedGame = savedGame;
        }
        return self;
    }
@end

@implementation ISN_GKSavedGameDeleteResult
-(id) init { return self = [super init]; }
@end

@implementation ISN_GKSavedGameLoadResult
    -(id) init { return self = [super init]; }
    -(id) initWithGKLoadData:(NSString *) data {
        self = [super init];
        if(self) {
            self.m_Data = data == NULL ? @"" : data;
        }
        return self;
    }
@end

@implementation ISN_GKResolveSavedGamesRequest
    -(id) init { return self = [super init]; }
@end

#endif

@implementation ISN_GKAchievement

-(id) init { return self = [super init]; }
-(id) initWithGKAchievementData:(GKAchievement *) achievement {
    self = [super init];
    if(self) {
        self.m_Identifier = achievement.identifier;
        self.m_PercentComplete = achievement.percentComplete;
        //self.m_completed = achievement.completed;
        
        if(achievement.lastReportedDate != NULL) {
            NSDate * mydate = [[NSDate alloc] init];
            NSTimeZone *zone = [NSTimeZone systemTimeZone];
            NSInteger interval = [zone secondsFromGMTForDate:achievement.lastReportedDate];
            mydate = [mydate dateByAddingTimeInterval:interval];
            self.m_LastReportedDate = [mydate timeIntervalSince1970];
        } else {
            self.m_LastReportedDate = 0;
        }
    }
    return self;
}
@end

@implementation ISN_GKAchievementsResult
-(id) init { return self = [super init]; }

-(id) initWithGKAchievementsData:(NSArray<ISN_GKAchievement> *) array {
    self = [super init];
    if(self) {
        self.m_Achievements = array;
    }
    return  self;
}
@end



@implementation ISN_GKScore : JSONModel


- (id) initWithGKScore:(GKScore *) score {
    
    
    self = [super init];
    if(self) {
        self.m_Rank = score.rank;
        self.m_Context = score.context;
        self.m_Value = score.value;
        
        
        if(score.date != NULL) {
            NSDate * mydate = [[NSDate alloc] init];
            NSTimeZone *zone = [NSTimeZone systemTimeZone];
            NSInteger interval = [zone secondsFromGMTForDate:score.date];
            mydate = [mydate dateByAddingTimeInterval:interval];
            self.m_Date = [mydate timeIntervalSince1970];
        } else {
            self.m_Date = 0;
        }
        
        self.m_LeaderboardIdentifier = score.leaderboardIdentifier;
        self.m_FormattedValue = score.formattedValue  == NULL ? @"" : score.formattedValue;
        
        if(score.player != NULL) {
            self.m_PlayerKey = [ISN_HashStorage Add:score.player];
        }
    }
    return self;
}

- (GKScore *) toGKScore {
    GKScore *score = [[GKScore alloc] initWithLeaderboardIdentifier: self.m_LeaderboardIdentifier];
    score.value = self.m_Value;
    score.context = self.m_Context;
    
    return score;
}

@end


@implementation ISN_GKLeaderboard

-(id) init { return self = [super init]; }
-(id) initWithGKLeaderboard:(GKLeaderboard *) leaderboard {
    self = [super init];
    if(self) {
        self.m_Identifier = leaderboard.identifier;
        self.m_GroupIdentifier = leaderboard.groupIdentifier  == NULL ? @"" : leaderboard.groupIdentifier;
        self.m_Title = leaderboard.title  == NULL ? @"" : leaderboard.title;
        
        self.m_PlayerScope = leaderboard.playerScope;
        self.m_TimeScope = leaderboard.timeScope;
        
        self.m_Range = [[ISN_NSRange alloc] initWithNSRange:leaderboard.range];
     
        self.m_MaxRange = leaderboard.maxRange;
        
       NSMutableArray<ISN_GKScore> *scoresArray = [[NSMutableArray<ISN_GKScore> alloc] init];
        
        if(leaderboard.scores != NULL) {
            for (GKScore* score in leaderboard.scores) {
                ISN_GKScore *isn_score = [[ISN_GKScore alloc] initWithGKScore:score];
                [scoresArray addObject:isn_score];
            }
        }
        
        self.m_Scores = scoresArray;
        
        if(leaderboard.localPlayerScore != NULL) {
            self.m_LocalPlayerScore = [[ISN_GKScore alloc] initWithGKScore:leaderboard.localPlayerScore];
        }
      
    }
    return self;
}

- (GKLeaderboard*) toGKLeaderboard {
    GKLeaderboard *leaderboard = [[GKLeaderboard alloc] init];
    
    if(self.m_Identifier.length > 0) {
        leaderboard.identifier = self.m_Identifier;
    }
    
    leaderboard.playerScope = self.m_PlayerScope;
    leaderboard.timeScope = self.m_TimeScope;
    leaderboard.range = [self.m_Range getNSRange];
    
  
    

    return leaderboard;
}

@end

@implementation ISN_GKLeaderboardsResult
-(id) init { return self = [super init]; }

-(id) initWithGKLeaderboards:(NSArray<ISN_GKLeaderboard> *) array {
    self = [super init];
    if(self) {
        self.m_Leaderboards = array;
    }
    return  self;
}
@end


@implementation ISN_GKScoreLoadResult
-(id) init { return self = [super init]; }
@end


@implementation ISN_GKScoreRequest : JSONModel
-(id) init { return self = [super init]; }
@end


@implementation ISN_GKIdentityVerificationSignatureResult

-(id) init { return self = [super init]; }
@end




