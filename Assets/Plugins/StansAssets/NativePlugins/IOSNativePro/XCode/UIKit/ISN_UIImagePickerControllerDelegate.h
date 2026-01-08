#if !TARGET_OS_TV
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

#import "ISN_UICommunication.h"


@interface ISN_UIImagePickerControllerDelegate : NSObject<UIImagePickerControllerDelegate, UINavigationControllerDelegate>
@property (nonatomic) ISN_UIPickerControllerRequest* controllerRequest ;
@end


#endif
