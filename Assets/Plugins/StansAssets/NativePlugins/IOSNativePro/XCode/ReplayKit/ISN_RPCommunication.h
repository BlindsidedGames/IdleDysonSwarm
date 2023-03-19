
#import <ReplayKit/ReplayKit.h>
#import "ISN_Foundation.h"



@interface ISN_RPStopResult : SA_Result
@property (nonatomic)  bool m_HasPreviewController;
@end


@interface ISN_PRPreviewResult : SA_Result
@property (nonatomic)  NSArray <NSString *> *m_ActivityTypes;
-(id) initWithActivityTypes:(NSArray <NSString *>*) activityTypes;
@end

