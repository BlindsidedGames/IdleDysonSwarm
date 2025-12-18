#import "JSONModel.h"
#import <GameKit/GameKit.h>
#import "ISN_Foundation.h"
#import "ISN_NSCommunication.h"


@interface ISN_GKLocalPlayerImageLoadResult : SA_Result
@property (nonatomic) NSString *m_ImageBase64;

@end


@interface ISN_GKGameCenterViewControllerShowResult : JSONModel

//Configuring the Game Center Controller’s Content
@property (nonatomic) NSString *m_LeaderboardIdentifier;
@property (nonatomic) GKLeaderboardTimeScope m_LeaderboardTimeScope;
@property (nonatomic) GKGameCenterViewControllerState m_ViewState;

@end

#if !TARGET_OS_TV

@protocol ISN_GKSavedGame;
@interface ISN_GKSavedGame : JSONModel

//Retrieving Information About a Saved Game File
@property (nonatomic) NSString *m_DeviceName;
@property (nonatomic) long m_ModificationDate;
@property (nonatomic) NSString *m_Name;
@property (nonatomic) NSString *m_Id;

-(id) initWithGKSavedGameWithId:(GKSavedGame *) savedGame withId:(NSString *)gameId;

@end


@interface ISN_GKSavedGameFetchResult : SA_Result
    @property (nonatomic) NSArray <ISN_GKSavedGame> *m_SavedGames;

    -(id) initWithSKSavedGamesArray:(NSArray<ISN_GKSavedGame> *) array;
@end

@interface ISN_GKSavedGameSaveResult : SA_Result
    @property (nonatomic) ISN_GKSavedGame *m_SavedGame;

    -(id) initWithGKSavedGameData:(ISN_GKSavedGame *) savedGame;
@end

@interface ISN_GKSavedGameDeleteResult : SA_Result
@end

@interface ISN_GKResolveSavedGamesRequest : JSONModel
    @property (nonatomic) NSArray <NSString*> *m_ConflictedGames;
    @property (nonatomic) NSString *m_Data;
@end

@interface ISN_GKSavedGameLoadResult : SA_Result
    @property (nonatomic) NSString *m_Data;

    -(id) initWithGKLoadData:(NSString *) data;
@end

#endif



@protocol ISN_GKAchievement;
@interface ISN_GKAchievement : JSONModel
    //Configuring an Achievement
    @property(copy, nonatomic) NSString *m_Identifier;
    @property(assign, nonatomic) double m_PercentComplete;
    @property(nonatomic) long m_LastReportedDate;

    - (id) initWithGKAchievementData:(GKAchievement *) achievement;
@end


@interface ISN_GKAchievementsResult : SA_Result
    @property (nonatomic) NSArray <ISN_GKAchievement> *m_Achievements;

    -(id) initWithGKAchievementsData:(NSArray<ISN_GKAchievement> *) array;
@end




@protocol ISN_GKScore;
@interface ISN_GKScore : JSONModel

@property(nonatomic) long m_Rank;
@property(nonatomic) long m_Value;
@property(nonatomic) unsigned long m_Context;
@property (nonatomic) long m_Date;

@property(copy, nonatomic) NSString *m_FormattedValue;
@property(copy, nonatomic) NSString *m_LeaderboardIdentifier;

@property (nonatomic) unsigned long m_PlayerKey;

- (id) initWithGKScore:(GKScore *) score;
- (GKScore *) toGKScore;
@end




@protocol ISN_GKLeaderboard;
@interface ISN_GKLeaderboard : JSONModel

//out convertation only
@property(copy, nonatomic) NSString *m_Identifier;
@property(copy, nonatomic) NSString *m_Title;
@property(copy, nonatomic) NSString *m_GroupIdentifier;


//in convertation
@property (nonatomic) GKLeaderboardPlayerScope m_PlayerScope;
@property (nonatomic) GKLeaderboardTimeScope m_TimeScope;
@property (nonatomic) ISN_NSRange * m_Range;
@property (nonatomic) long m_MaxRange;
@property (nonatomic) NSArray <ISN_GKScore> *m_Scores;
@property (nonatomic) ISN_GKScore * m_LocalPlayerScore;

- (GKLeaderboard*) toGKLeaderboard;
- (id) initWithGKLeaderboard:(GKLeaderboard *) leaderboard;

@end

@interface ISN_GKLeaderboardsResult : SA_Result
@property (nonatomic) NSArray <ISN_GKLeaderboard> *m_Leaderboards;

-(id) initWithGKLeaderboards:(NSArray<ISN_GKLeaderboard> *) array;
@end

@interface ISN_GKScoreLoadResult : SA_Result
@property (nonatomic) NSArray <ISN_GKScore> *m_Scores;
@property (nonatomic) ISN_GKLeaderboard *m_Leaderboard;

//-(id) initWithGKLeaderboards:(NSArray<ISN_GKScore> *) array localPlayerScore (ISN_GKScore*) localPlayerScore;
@end

@interface ISN_GKScoreRequest : JSONModel
@property (nonatomic) NSArray <ISN_GKScore> *m_Scores;
@end



@interface ISN_GKIdentityVerificationSignatureResult : SA_Result
@property (nonatomic) NSString * m_PublicKeyUrl;
@property (nonatomic) NSString * m_Signature;
@property (nonatomic) NSString * m_Salt;
@property (nonatomic) uint64_t m_Timestamp;

@end
