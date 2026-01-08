#import <AVFoundation/AVFoundation.h>
#import <AVKit/AVKit.h>
#import "ISN_Foundation.h"
#import "ISN_AVCommunication.h"




@interface ISN_AVPlayerViewController : JSONModel

@property(nonatomic) ISN_AVPlayer* m_Player;
@property(nonatomic) bool m_ShowsPlaybackControls;
@property(nonatomic) bool m_AllowsPictureInPicturePlayback;
@property(nonatomic) bool m_ShouldCloseWhenFinished;


-(AVPlayerViewController* ) toAVPlayerViewController;

@end


@implementation ISN_AVPlayerViewController : JSONModel

-(AVPlayerViewController*) toAVPlayerViewController {
    AVPlayerViewController *playerViewController = [[AVPlayerViewController alloc] init];
    playerViewController.player = [self.m_Player toAVPlayer];
    playerViewController.showsPlaybackControls = self.m_ShowsPlaybackControls;

    #if !TARGET_OS_TV
    playerViewController.allowsPictureInPicturePlayback = self.m_AllowsPictureInPicturePlayback;
#endif

    return playerViewController;

}
@end




@interface ISN_AVPlayerViewControllerDelegate : NSObject<AVPlayerViewControllerDelegate>
@property(nonatomic) AVPlayerViewController* m_viewController;

-(id) initWithPlyer:(AVPlayerViewController *) viewController settings: (ISN_AVPlayerViewController*) settings;

@end



@implementation ISN_AVPlayerViewControllerDelegate

-(id) initWithPlyer:(AVPlayerViewController *) viewController settings: (ISN_AVPlayerViewController*) settings {
    self = [super init];
    if(self) {
        self.m_viewController = viewController;
        self.m_viewController.delegate = self;


        if(self.m_viewController.player != nil && self.m_viewController.player.currentItem != nil && settings.m_ShouldCloseWhenFinished) {
            [[NSNotificationCenter defaultCenter] addObserver:self
                                                     selector:@selector(playerItemDidReachEnd:)
                                                         name:AVPlayerItemDidPlayToEndTimeNotification
                                                       object:self.m_viewController.player.currentItem];
        }


    }

    return self;
}

- (void)playerItemDidReachEnd:(NSNotification *)notification {

    NSLog(@"playerItemDidReachEnd");
    [self.m_viewController dismissViewControllerAnimated:YES completion:nil];
    [[NSNotificationCenter defaultCenter]removeObserver:self
                                                   name:AVPlayerItemDidPlayToEndTimeNotification
                                                 object:self.m_viewController.player.currentItem];
}

@end



static ISN_AVPlayerViewControllerDelegate*  s_viewControllerDelegate;
extern "C" {

    void _ISN_AV_ShowPlayerViewController(char* json) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_AV_ShowPlayerViewController" data:json];

        NSError *jsonError;
        ISN_AVPlayerViewController *isn_playerViewController = [[ISN_AVPlayerViewController alloc] initWithChar:json error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_AV_ShowPlayerViewController JSON parsing error: %@", jsonError.description];
            return;
        }



        AVPlayerViewController *playerViewController = [isn_playerViewController toAVPlayerViewController];
        UIViewController *vc =  UnityGetGLViewController();
        [vc presentViewController:playerViewController animated:YES completion:nil];
        [playerViewController.player play];

        s_viewControllerDelegate = [[ISN_AVPlayerViewControllerDelegate alloc] initWithPlyer:playerViewController settings:isn_playerViewController];

    }

}

