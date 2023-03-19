
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

#import "ISN_Foundation.h"
#import "ISN_UICommunication.h"
#if !TARGET_OS_TV
#import "ISN_UIWheelPickerDelegate.h"

static UnityAction *WheelPickerCallback;

@interface ISN_UIWheelPickerController : NSObject
@property (nonatomic)  ISN_UIWheelPickerDelegate *m_pickerDelegate;
@property (nonatomic) UIView *inputView;
@end

@implementation ISN_UIWheelPickerController


//--------------------------------------
//  Initialization
//--------------------------------------


static ISN_UIWheelPickerController * s_sharedInstance;
+ (id)sharedInstance {
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    return s_sharedInstance;
}

-(id) init {
    self = [super init];
    if(self) {
        self.m_pickerDelegate = [[ISN_UIWheelPickerDelegate alloc] init];
    }
    return self;
}

- (void)disableTouchesOnView:(UIView *)view {
    UIButton *ghostButton = [[UIButton alloc] initWithFrame:CGRectMake(0, 0, view.frame.size.width, view.frame.size.height)];
    [ghostButton setBackgroundColor:[UIColor clearColor]];
    ghostButton.tag = 42; // Any random number. Use #define to avoid putting numbers in code.
    
    [view addSubview:ghostButton];
}


- (void) showWheelPicker: (ISN_UIWheelPickerRequest *) request
{
    UIViewController *vc =  UnityGetGLViewController();
    
    [self.m_pickerDelegate init:WheelPickerCallback data:request.m_Values defaultValue:request.m_Default];
    [self disableTouchesOnView:vc.view];
    
    UIPickerView *picker = [[UIPickerView alloc] init];
    
    picker.delegate = self.m_pickerDelegate;
    picker.dataSource = self.m_pickerDelegate;
    picker.showsSelectionIndicator = YES;
    [picker selectRow:request.m_Default inComponent:0 animated:YES];
    
    UIView *buttons = [[UIView alloc] init];
    [buttons setUserInteractionEnabled:true];
    [buttons setBackgroundColor:[UIColor colorWithRed:0.7 green:0.7 blue:0.7 alpha:0.1]];

    picker.backgroundColor = [UIColor whiteColor];
    
    if (@available(iOS 12.0, *)) {
       if([vc traitCollection].userInterfaceStyle == UIUserInterfaceStyleDark) {
           picker.backgroundColor = [UIColor grayColor];
           [buttons setBackgroundColor:[UIColor colorWithRed:0.7 green:0.7 blue:0.7 alpha:0.7]];
       }
    }
    
    self.inputView = [[UIView alloc] initWithFrame:CGRectMake(0,[UIScreen mainScreen].bounds.size.height-picker.frame.size.height-22, [UIScreen mainScreen].bounds.size.width, picker.frame.size.height + 44)];
    
    [picker setFrame:CGRectMake(0, 0, self.inputView.frame.size.width, self.inputView.frame.size.height)];
    
    [self.inputView addSubview:picker];
    [self.inputView addSubview:buttons];
    
    [vc.view addSubview:self.inputView];
    
#pragma mark Toolbar
    
    CGFloat width = [UIScreen mainScreen].bounds.size.width*1/4;
    
    [buttons setTranslatesAutoresizingMaskIntoConstraints:false];
    [buttons.leadingAnchor constraintEqualToAnchor:picker.leadingAnchor].active = true;
    [buttons.topAnchor constraintEqualToAnchor:picker.topAnchor].active = true;
    [buttons.trailingAnchor constraintEqualToAnchor:picker.trailingAnchor].active = true;
    [buttons.widthAnchor constraintEqualToConstant:55].active = true;
    
    UIButton *cancel = [UIButton buttonWithType:UIButtonTypeSystem];
    [cancel setTitle:@"Cancel" forState:UIControlStateNormal];
    [cancel addTarget:self action:@selector(cancelButton) forControlEvents:UIControlEventTouchUpInside];
    [buttons addSubview:cancel];
    [cancel setTranslatesAutoresizingMaskIntoConstraints:false];
    
    [cancel.leadingAnchor constraintEqualToAnchor:buttons.leadingAnchor].active = true;
    [cancel.topAnchor constraintEqualToAnchor:buttons.topAnchor].active = true;
    [cancel.bottomAnchor constraintEqualToAnchor:buttons.bottomAnchor].active = true;
    [cancel.widthAnchor constraintEqualToConstant:width].active = true;
    
    UIButton *done = [UIButton buttonWithType:UIButtonTypeSystem];
    [done setTitle:@"Done" forState:UIControlStateNormal];
    [done addTarget:self action:@selector(doneButton) forControlEvents:UIControlEventTouchUpInside];
    [buttons addSubview:done];
    [done setTranslatesAutoresizingMaskIntoConstraints:false];
    
    [done.trailingAnchor constraintEqualToAnchor:buttons.trailingAnchor].active = true;
    [done.topAnchor constraintEqualToAnchor:buttons.topAnchor].active = true;
    [done.bottomAnchor constraintEqualToAnchor:buttons.bottomAnchor].active = true;
    [done.widthAnchor constraintEqualToConstant: width].active = true;
    
    UIButton *flex = [[UIButton alloc] init];
    [buttons addSubview:flex];
    [flex setTranslatesAutoresizingMaskIntoConstraints:false];
    
    [flex.trailingAnchor constraintEqualToAnchor:done.leadingAnchor].active = true;
    [flex.topAnchor constraintEqualToAnchor:buttons.topAnchor].active = true;
    [flex.bottomAnchor constraintEqualToAnchor:buttons.bottomAnchor].active = true;
    [flex.leadingAnchor constraintEqualToAnchor:cancel.trailingAnchor].active = true;
}

- (void) doneButton
{
    ISN_UIWheelPickerResult *result = [[ISN_UIWheelPickerResult alloc] init];
    result.m_Value = self.m_pickerDelegate.m_value;
    result.m_State = @"Done";
    ISN_SendCallbackToUnity(WheelPickerCallback, [result toJSONString]);
    [self.inputView removeFromSuperview];
    
     UIViewController *vc =  UnityGetGLViewController();
     [[vc.view viewWithTag:42] removeFromSuperview];
}

- (void) cancelButton
{
    ISN_UIWheelPickerResult *result = [[ISN_UIWheelPickerResult alloc] init];
    result.m_Value = self.m_pickerDelegate.m_value;
    result.m_State = @"Canceled";
    ISN_SendCallbackToUnity(WheelPickerCallback, [result toJSONString]);
    [self.inputView removeFromSuperview];
    
    UIViewController *vc =  UnityGetGLViewController();
    [[vc.view viewWithTag:42] removeFromSuperview];
}


@end

#endif

extern "C" {
    
    void _ISN_UIWheelPicker(UnityAction *callback, char* data)
    {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UIWheelPicker" data:data];
        
        NSError *jsonError;
        ISN_UIWheelPickerRequest *request = [[ISN_UIWheelPickerRequest alloc] initWithChar:data error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_UIWheelPicker JSON parsing error: %@", jsonError.description];
        }
#if !TARGET_OS_TV
        WheelPickerCallback = callback;
        [[ISN_UIWheelPickerController sharedInstance] showWheelPicker:request];
#else
        ISN_UIWheelPickerResult *result = [[ISN_UIWheelPickerResult alloc] init];
        result.m_Value = [request.m_Values firstObject];
        result.m_State = @"Canceled";
        ISN_SendCallbackToUnity(callback, [result toJSONString]);

#endif
    }
}
