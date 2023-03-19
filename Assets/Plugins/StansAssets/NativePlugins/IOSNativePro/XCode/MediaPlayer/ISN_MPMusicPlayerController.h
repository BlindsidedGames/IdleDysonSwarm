//
//  ISN_MPMusicPlayerController.h
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 1/5/19.
//

#if !TARGET_OS_TV

#import <Foundation/Foundation.h>
#import <MediaPlayer/MediaPlayer.h>

#import "JSONModel.h"
#import "ISN_Foundation.h"



@protocol ISN_MPMediaItem;
@interface ISN_MPMediaItem : JSONModel
@property (nonatomic) NSString* m_Title;
@property (nonatomic) NSString* m_Artist;
@property (nonatomic) NSString* m_AlbumTitle;
@property (nonatomic) NSString* m_Composer;
@property (nonatomic) NSString* m_Genre;
@property (nonatomic) NSString* m_Lyrics;

-(id) initWithMPMediaItem:(MPMediaItem *) item;
@end


@interface ISN_MPMusicPlayerController : JSONModel

@property (nonatomic) NSString *m_playerID;
@property (nonatomic) NSString *m_alias;
@property (nonatomic) NSString *m_displayName;


+ (NSString*) cachePlayer:(MPMusicPlayerController *)player;
+ (MPMusicPlayerController*) getCachedPlayer:(NSString*) playerId;

@end

#endif
