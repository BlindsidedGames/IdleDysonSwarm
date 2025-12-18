//
//  ISN_MPMusicPlayerController.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 1/5/19.
//

#if !TARGET_OS_TV

#import "ISN_MPMusicPlayerController.h"
#import "ISN_NSCommunication.h"

@implementation ISN_MPMediaItem
-(id) init { return self = [super init]; }
-(id) initWithMPMediaItem:(MPMediaItem *) item  {
    self = [super init];
    if(self) {
        if([item title] != NULL) {
            self.m_Title         = [item title]  == NULL ? @"" : [item title];
            self.m_Artist        = [item artist]  == NULL ? @"" : [item artist];
            self.m_AlbumTitle    = [item albumTitle]  == NULL ? @"" : [item albumTitle];
            self.m_Composer      = [item composer]  == NULL ? @"" : [item composer];
            self.m_Genre         = [item genre]  == NULL ? @"" : [item genre];
            self.m_Lyrics        = [item lyrics]  == NULL ? @"" : [item lyrics];
        }

    }
    return self;
}
@end


@implementation ISN_MPMusicPlayerController

static NSMutableDictionary * s_playersCache = [[NSMutableDictionary alloc] init];



+ (NSString*) cachePlayer:(MPMusicPlayerController *)player{
    NSString* playerId = [NSString stringWithFormat:@"%lu", (unsigned long)player.hash];
    NSLog(@"cachePlayer uniqueId:  %@", playerId);
    [s_playersCache setObject:player forKey:playerId];

    return playerId;
}


+ (MPMusicPlayerController*) getCachedPlayer:(NSString*) playerId {
    return [s_playersCache objectForKey:playerId];
}




@end




extern "C" {


    char* _ISN_Get_SystemMusicPlayer() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_Get_SystemMusicPlayer" data:""];

        MPMusicPlayerController* player = [MPMusicPlayerController systemMusicPlayer];
        NSString* playerId = [ISN_MPMusicPlayerController cachePlayer:player];

        return ISN_ConvertToChar(playerId);
    }

    char* _ISN_Get_ApplicationMusicPlayer() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_Get_ApplicationMusicPlayer" data:""];

        MPMusicPlayerController* player = [MPMusicPlayerController applicationMusicPlayer];
        NSString* playerId = [ISN_MPMusicPlayerController cachePlayer:player];
        return ISN_ConvertToChar(playerId);
    }

    char* _ISN_Get_ApplicationQueuePlayer() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_Get_ApplicationQueuePlayer" data:""];

        MPMusicPlayerController* player = [MPMusicPlayerController applicationQueuePlayer];
        NSString* playerId = [ISN_MPMusicPlayerController cachePlayer:player];
        return ISN_ConvertToChar(playerId);
    }




    void _ISN_MPMusicPlayer_Play(char* playerId) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMusicPlayer_Play" data:playerId];

        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];
        [player play];
    }

    void _ISN_MPMusicPlayer_Stop(char* playerId) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMusicPlayer_Stop" data:playerId];

        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];
        [player stop];
    }

    void _ISN_MPMusicPlayer_Pause(char* playerId) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMusicPlayer_Pause" data:playerId];

        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];
        [player pause];
    }


    void _ISN_MPMusicPlayer_SkipToNextItem(char* playerId) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMusicPlayer_SkipToNextItem" data:playerId];

        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];
        [player skipToNextItem];
    }

    void _ISN_MPMusicPlayer_SkipToPreviousItem(char* playerId) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMusicPlayer_SkipToPreviousItem" data:playerId];

        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];
        [player skipToPreviousItem];
    }


    void _ISN_MPMusicPlayer_BeginGeneratingPlaybackNotifications(char* playerId) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMusicPlayer_SkipToPreviousItem" data:playerId];

        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];
        [player beginGeneratingPlaybackNotifications];


        //That's a small hack, without it for some reason NSNotificationCenter does not fire the notifications

        [[NSNotificationCenter defaultCenter] addObserverForName:MPMusicPlayerControllerPlaybackStateDidChangeNotification
                                                          object:nil
                                                           queue:nil
                                                      usingBlock:^(NSNotification * _Nonnull note) {
                                                         //Do nothing
                                                      }];

        [[NSNotificationCenter defaultCenter] addObserverForName:MPMusicPlayerControllerNowPlayingItemDidChangeNotification
                                                          object:nil
                                                           queue:nil
                                                      usingBlock:^(NSNotification * _Nonnull note) {
                                                          //Do nothing
                                                      }];
    }


    void _ISN_MPMusicPlayer_EndGeneratingPlaybackNotifications(char* playerId) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMusicPlayer_SkipToPreviousItem" data:playerId];

        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];
        [player endGeneratingPlaybackNotifications];
    }

    void _ISN_MPMusicPlayer_SetQueueWithStoreIDs(char* playerId, char* data) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMusicPlayer_SetQueueWithStoreIDs" data:data];

        NSError *jsonError;
        ISN_NSArrayModel *arrayModel = [[ISN_NSArrayModel alloc] initWithChar:data error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_MPMusicPlayer_SetQueueWithStoreIDs JSON parsing error: %@", jsonError.description];
        }

        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];

        [player setQueueWithStoreIDs:arrayModel.m_Value];

    }

    void _ISN_MPMusicPlayer_setQueueWithItemCollection(char* playerId, unsigned long collectionHash) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMusicPlayer_setQueueWithItemCollection" data:""];

        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];
        MPMediaItemCollection *collection = (MPMediaItemCollection*) [ISN_HashStorage Get:collectionHash];

        [player setQueueWithItemCollection:collection];

    }

    int _ISN_MPMusicPlaye_PlaybackState(char* playerId) {

        [ISN_Logger LogNativeMethodInvoke:"_ISN_Get_NowPlayingItem" data:playerId];
        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];

        switch (player.playbackState) {
            case MPMusicPlaybackStateStopped:
                return 0;
            case MPMusicPlaybackStatePlaying:
                return 1;
            case MPMusicPlaybackStatePaused:
                return 2;
            case MPMusicPlaybackStateInterrupted:
                return 3;
            case MPMusicPlaybackStateSeekingForward:
                return 4;
            case MPMusicPlaybackStateSeekingBackward:
                return 5;
            default:
                 return 0;
        }
    }

    char* _ISN_MPMusicPlaye_NowPlayingItem(char* playerId) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_Get_NowPlayingItem" data:playerId];

        NSString* playerID =  ISN_ConvertToString(playerId);
        MPMusicPlayerController* player = [ISN_MPMusicPlayerController getCachedPlayer:playerID];

        MPMediaItem* item = [player nowPlayingItem];
        ISN_MPMediaItem *isn_item = [[ISN_MPMediaItem alloc] initWithMPMediaItem:item];


        return ISN_ConvertToChar([isn_item toJSONString]);

    }
}

#endif
