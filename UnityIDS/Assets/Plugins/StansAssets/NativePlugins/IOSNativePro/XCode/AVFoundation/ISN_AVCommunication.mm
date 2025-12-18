#import "ISN_AVCommunication.h"



@implementation ISN_AVPlayer : JSONModel

-(AVPlayer*) toAVPlayer {
    AVPlayer* player;
    NSURL* ulr = [self.m_Url toNSURL];
    player = [AVPlayer playerWithURL:ulr];
    
    player.volume = self.m_Volume;
    
    return  player;
}

@end



