#if !TARGET_OS_TV

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

#import "ISN_UICommunication.h"

@interface ISN_UIWheelPickerDelegate : NSObject<UIPickerViewDelegate, UIPickerViewDataSource>
@property (nonatomic) NSString *m_value;
-(void)init:(UnityAction *)callback data:(NSArray <NSString *> *)m_array defaultValue:(int)m_default;
@end


#endif
