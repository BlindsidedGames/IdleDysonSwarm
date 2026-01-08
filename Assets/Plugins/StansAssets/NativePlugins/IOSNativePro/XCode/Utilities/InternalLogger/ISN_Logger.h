

@interface ISN_Logger : NSObject

+ (void) Log: (NSString *) msg, ...;
+ (void) LogWarning: (NSString *) msg, ...;
+ (void) LogError: (NSString *) msg, ...;
+ (void) SetLogLevel: (BOOL) info warning:(BOOL) warning error:(BOOL) error;

+(void) LogNativeMethodInvoke:(const char* )method data:(const char*) data;
+(void) LogUnityMethodInvoke:(const char* )method data:(NSString*) data;
+(void) LogCallbackInvoke:(NSString*) data;

@end

