#import "ISN_Foundation.h"


@interface ISN_UIAvailableMediaTypes : JSONModel
@property (nonatomic) NSArray <NSString *> *m_Types;
-(id) initWithArray:(NSArray <NSString *> *) array;
@end


#if !TARGET_OS_TV
@interface ISN_UIPickerControllerRequest : JSONModel
@property (nonatomic) NSArray <NSString *> *m_MediaTypes;
@property (nonatomic) UIImagePickerControllerSourceType m_SourceType;
@property (nonatomic) UIImagePickerControllerCameraDevice m_CameraDevice;
@property (nonatomic) UIModalPresentationStyle m_ModalPresentationStyle;
@property (nonatomic) bool m_AllowsEditing;
@property (nonatomic) float m_ImageCompressionRate;
@property (nonatomic) int m_MaxImageSize;
@property (nonatomic) int m_EncodingType;

@end
#endif

@interface ISN_UIPickerControllerResult : SA_Result
@property (nonatomic) NSString*  m_MediaUrl;
@property (nonatomic) NSString*  m_ImageUrl;
@property (nonatomic) NSString*  m_MediaType;
@property (nonatomic) NSString*  m_EncodedImage;

@end



@interface UIImage (fixOrientation)
- (UIImage *)fixOrientation;
@end



//--------------------------------------
//  Build Info
//--------------------------------------

@protocol ISN_BuildInfo;
@interface ISN_BuildInfo : JSONModel
@property (nonatomic) NSString* m_appVersion;
@property (nonatomic) NSString* m_buildNumber;
@end


//--------------------------------------
//  UIAlertController
//--------------------------------------

@protocol ISN_UIAlertAction;
@interface ISN_UIAlertAction : JSONModel
@property (nonatomic) int m_Id;
@property (nonatomic) NSString* m_Title;
@property (nonatomic) NSString* m_Image;
@property (nonatomic) UIAlertActionStyle m_Style;



@property (nonatomic) bool m_Enabled;
@property (nonatomic) bool m_Preferred;
@end


@protocol ISN_UIAlertController;
@interface ISN_UIAlertController : JSONModel
@property (nonatomic) int m_Id;
@property (nonatomic) NSString* m_Title;
@property (nonatomic) NSString* m_Message;
@property (nonatomic) UIAlertControllerStyle m_PreferredStyle;
@property (nonatomic) NSArray <ISN_UIAlertAction>* m_Actions;
@end



@interface ISN_UIAlertActionId : JSONModel
@property (nonatomic) int m_AlertId;
@property (nonatomic) int m_ActionId;
@end


@interface ISN_UIRegisterRemoteNotificationsResult : SA_Result
@property (nonatomic) NSString* m_DeviceTokenUtf8;
@end

@interface ISN_UIApplicationEvents : JSONModel
@property (nonatomic) NSString *m_EventName;
@property (nonatomic) NSString *m_Data;
-(void)init:(NSString *)eventName data:(NSString *)data;
@end

@interface ISN_UIWheelPickerRequest : JSONModel
@property (nonatomic) NSArray <NSString *> *m_Values;
@property (nonatomic) int m_Default;
@end


@interface ISN_UIWheelPickerResult : JSONModel
@property (nonatomic) NSString *m_Value;
@property (nonatomic) NSString *m_State;
@end

