#import "JSONModel.h"
#import "ISN_Foundation.h"
#import "ISN_NSCommunication.h"

#import <AVFoundation/AVFoundation.h>


@protocol ISN_AVPlayer;
@interface ISN_AVPlayer : JSONModel

@property(nonatomic) ISN_NSURL* m_Url;
@property(nonatomic) float m_Volume;


-(AVPlayer* ) toAVPlayer;

@end
