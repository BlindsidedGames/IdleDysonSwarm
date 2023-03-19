#import "ISN_RPCommunication.h"


@implementation ISN_RPStopResult : SA_Result
-(id) init { return self = [super init]; }
@end


@implementation ISN_PRPreviewResult
-(id) init { return self = [super init]; }
-(id) initWithActivityTypes:(NSArray <NSString *>*) activityTypes; {
    self = [super init];
    if(self) {
        self.m_ActivityTypes = activityTypes;
    }
    return  self;
}
@end


