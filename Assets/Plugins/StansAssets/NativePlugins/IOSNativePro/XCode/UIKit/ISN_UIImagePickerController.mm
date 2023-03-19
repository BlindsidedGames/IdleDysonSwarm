#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import "ISN_Foundation.h"
#import "ISN_UICommunication.h"
#if !TARGET_OS_TV
#import "ISN_UIImagePickerControllerDelegate.h"

@interface ISN_UIImagePickerController : NSObject


@property (nonatomic)  ISN_UIImagePickerControllerDelegate *m_pickerDelegate;
@end




@implementation ISN_UIImagePickerController


//--------------------------------------
//  Initialization
//--------------------------------------


static ISN_UIImagePickerController * s_sharedInstance;
+ (id)sharedInstance {
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    return s_sharedInstance;
}

-(id) init {
    self = [super init];
    if(self) {
        self.m_pickerDelegate = [[ISN_UIImagePickerControllerDelegate alloc] init];
    }
    return self;
}


//--------------------------------------
// Pick
//--------------------------------------

-(void) presentPickerController:(ISN_UIPickerControllerRequest*) request {
    
    [self.m_pickerDelegate setControllerRequest:request];
    
    UIViewController *vc =  UnityGetGLViewController();
    UIImagePickerController *picker = [[UIImagePickerController alloc] init];

    picker.mediaTypes = request.m_MediaTypes;
    picker.sourceType = request.m_SourceType;
    picker.allowsEditing  = request.m_AllowsEditing;
    
    // this is unset view controller options (i.e. Automatic, but ios lover then 13 won't have an aytomatic options avaliable)
    if(request.m_ModalPresentationStyle !=  -2) {
         picker.modalPresentationStyle = request.m_ModalPresentationStyle;
    }
    
    /*
    if (SYSTEM_VERSION_LESS_THAN(@"13.0")) {
        // Automatic only avaliable in iOS 13 or later
        if(request.m_ModalPresentationStyle == -2) {
            NSLog(@"iOS Native WARNINGN: you are trying to use UIModalPresentationAutomatic with ios version less then 13, plugins will fallback to UIModalPresentationOverFullScreen");
            picker.modalPresentationStyle = UIModalPresentationOverFullScreen;
        }
    } else {
         picker.modalPresentationStyle = request.m_ModalPresentationStyle;
    }*/
   
    
    if(picker.sourceType == UIImagePickerControllerSourceTypeCamera) {
         picker.cameraDevice = request.m_CameraDevice;
    }
    
    picker.delegate = self.m_pickerDelegate;
    [vc presentViewController:picker animated:YES completion:nil];
}

@end

#endif


extern "C" {

    char* _ISN_UI_GetAvailableMediaTypesForSourceType(int type) {
#if !TARGET_OS_TV
        UIImagePickerControllerSourceType sourceType = static_cast<UIImagePickerControllerSourceType>(type);
        NSArray * array =  [UIImagePickerController availableMediaTypesForSourceType:sourceType];
        
        ISN_UIAvailableMediaTypes * result = [[ISN_UIAvailableMediaTypes alloc] initWithArray:array];
        const char* string = [[result toJSONString] UTF8String];
        char* res = (char*)malloc(strlen(string) + 1);
        strcpy(res, string);
        return res;
#else
        return nil;
#endif
    }
    
    bool _ISN_UI_IsSourceTypeAvailable(int type) {
#if !TARGET_OS_TV
        UIImagePickerControllerSourceType sourceType = static_cast<UIImagePickerControllerSourceType>(type);
        return [UIImagePickerController isSourceTypeAvailable:sourceType];
#else
        return false;
#endif
    }
    
    void _ISN_UI_PresentPickerController(char* data) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UI_PresentPickerController" data:data];
#if !TARGET_OS_TV
        NSError *jsonError;
        ISN_UIPickerControllerRequest *request = [[ISN_UIPickerControllerRequest alloc] initWithChar:data error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_LoadStore JSON parsing error: %@", jsonError.description];
        }
        
        [[ISN_UIImagePickerController sharedInstance] presentPickerController:request];
#endif
    }
}

