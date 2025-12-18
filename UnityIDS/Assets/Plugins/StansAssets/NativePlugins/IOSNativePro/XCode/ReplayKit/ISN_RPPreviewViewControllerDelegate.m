#include "ISN_RPPreviewViewControllerDelegate.h"
#include "ISN_RPCommunication.h"

@implementation ISN_RPPreviewViewControllerDelegate

-(id) init { return self = [super init]; }

- (void)previewControllerDidFinish:(RPPreviewViewController *)previewController {
    //No point so far to use this callback, since we always have "didFinishWithActivityTypes" event fired
}


- (void)previewController:(RPPreviewViewController *)previewController didFinishWithActivityTypes:(NSSet <NSString *> *)activityTypes {
    
    
    [previewController dismissViewControllerAnimated:YES completion:nil];
    NSMutableArray *items = [NSMutableArray arrayWithArray:[activityTypes allObjects]];
    ISN_PRPreviewResult* result = [[ISN_PRPreviewResult alloc] initWithActivityTypes:items];
    
    ISN_SendMessage(UNITY_RP_LISTENER, "OnShareDialogResult", [result toJSONString]);
}


@end
