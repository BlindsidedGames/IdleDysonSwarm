#import "ISN_Foundation.h"
#import "ISN_Logger.h"

//--------------------------------------
// Constants
//--------------------------------------

const char* UNITY_SK_LISTENER = "SA.iOS.StoreKit.ISN_SKNativeAPI";
const char* UNITY_RP_LISTENER = "SA.iOS.ReplayKit.ISN_RPNativeAPI";
const char* UNITY_CN_LISTENER = "SA.iOS.Contacts.Internal.ISN_CNNativeAPI";
const char* UNITY_AV_LISTENER = "SA.iOS.AVFoundation.Internal.ISN_AVNativeAPI";
const char* UNITY_UI_LISTENER = "SA.iOS.UIKit.ISN_UINativeAPI";
const char* UNITY_CK_LISTENER = "SA.iOS.Foundation.ISN_NSNativeAPI";
const char* UNITY_UN_LISTENER = "SA.iOS.UserNotifications.ISN_UNNativeAPI";
const char* UNITY_APP_DELEGATE = "SA.iOS.UIKit.ISN_UIApplicationDelegate";


//--------------------------------------
// Templates
//--------------------------------------

@implementation SA_Error
-(id) init {
    self = [super init];
    if(self) {
        self.m_code = 0;
        self.m_message = @"";
    }

    return self;
}
-(id) initWithCode:(int)code message:(NSString* ) message  {

    self = [super init];
    if(self) {
        self.m_code = code;
        self.m_message = message;
    }

    return self;
}
-(id) initWithNSError:(NSError *) error  {
    self = [super init];
    if(self) {
        self.m_code = (int) error.code;
        self.m_message = error.description;
    }

    return self;
}

@end

@implementation SA_Result
-(id) init {
    self = [super init];
    if(self) {
        self.m_error = [[SA_Error alloc] init];
    }

    return self;
}
-(id) initWithError:(SA_Error*)error {

    self = [super init];
    if(self) {
        if(error != NULL) {
            self.m_error = error;
        } else {
            self.m_error = [[SA_Error alloc] init];
        }
    }

    return self;
}

-(id) initWithNSError:(NSError *) error  {
    self = [super init];
    if(self) {
        self.m_error = [[SA_Error alloc] initWithNSError:error];
    }
    return self;
}

-(void) setRequestId:(NSString *) requestId {
    self.m_requestId = requestId;
}

-(void) setData:(NSString *) data {
    self.m_stringData = data;
}

@end


//--------------------------------------
// Extentions
//--------------------------------------

@implementation NSData (Base64)
+ (NSData *)InitFromBase64String:(NSString *)aString {
    return [[NSData alloc] initWithBase64EncodedString:aString options:NSDataBase64DecodingIgnoreUnknownCharacters];
}

- (NSString *)AsBase64String {
    return [self base64EncodedStringWithOptions:0];
}
@end


@implementation NSDictionary (JSON)
- (NSString *)AsJSONString {
    NSError *error;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:self options:0  error:&error];
    if (!jsonData) {
        return @"{}";
    } else {
        return [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
    }
}
@end


//--------------------------------------
// Mono Callback
//--------------------------------------

typedef void (*MonoPCallbackDelegate)(UnityAction action, const char* data);

static MonoPCallbackDelegate _monoPCallbackDelegate = NULL;

FOUNDATION_EXPORT void RegisterCallbackDelegate(MonoPCallbackDelegate callbackDelegate) {
    _monoPCallbackDelegate = callbackDelegate;
}

//--------------------------------------
// extern "C"
//--------------------------------------

static NSMutableDictionary *objectsRefStorage = nil;// [[NSMutableDictionary alloc] init];


#ifdef __cplusplus
extern "C" {
#endif



    int _ISN_SaveObjectRef(NSObject* object) {

        if(objectsRefStorage == nil) {
            objectsRefStorage = [[NSMutableDictionary alloc] init];
        }

        NSUInteger* hash =[object hash];
        NSNumber* num = [NSNumber numberWithUnsignedInteger:hash];
        [objectsRefStorage setObject:object forKey:num];

        return num.intValue;
    }

    NSObject* _ISN_GetObjectRef(int hash) {
        NSNumber *num  = [NSNumber numberWithInt:hash];
        return [objectsRefStorage objectForKey:num];
    }



    void ISN_SendMessage(const char* obj, const char* method, NSString* msg) {
        [ISN_Logger LogUnityMethodInvoke:method data:msg];
        UnitySendMessage(obj, method, [msg UTF8String]);
    }

    char* ISN_ConvertToChar(NSString* nsString) {
        const char* string = [nsString UTF8String];
        char* res = (char*)malloc(strlen(string) + 1);
        strcpy(res, string);
        return res;
    }

    NSString* ISN_ConvertBoolToString(BOOL value) {
        return value ? @"true" : @"false";
    }

    NSString* ISN_ConvertToString(char* data) {
        return data == NULL ? [NSString stringWithUTF8String: ""] : [NSString stringWithUTF8String: data];
    }

    NSString* ISN_ConvertToBase64(NSData* data) {
        return [data base64EncodedStringWithOptions:0];
    }

    NSString* ISN_ConvertImageToBase64(UIImage* image) {
        NSData *imageData = UIImagePNGRepresentation(image);
        return  [imageData base64EncodedStringWithOptions:0];
    }

    NSString* ISN_ConvertImageToJPEGBase64(UIImage* image, CGFloat compression) {
        NSData *imageData = UIImageJPEGRepresentation(image, compression);
        return  [imageData base64EncodedStringWithOptions:0];
    }

    // Этот метод можно объявить в каком-нибудь классе
    void ISN_SendCallbackToUnity(UnityAction callback, NSString* data) {
        if(callback == NULL)
            return;

        if(data == NULL) {
            data = @"";
        }
        [ISN_Logger LogCallbackInvoke:data];

        // Переводим исполнение в Unity (главный) поток
        dispatch_async(dispatch_get_main_queue(), ^{
            if(_monoPCallbackDelegate != NULL)
                _monoPCallbackDelegate(callback, [data cStringUsingEncoding:NSUTF8StringEncoding]);
        });
    }
#if __cplusplus
}   // Extern C
#endif











