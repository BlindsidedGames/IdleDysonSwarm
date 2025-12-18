#import "ISN_Logger.h"
#import <Foundation/Foundation.h>

BOOL INFO;
BOOL WARNING;
BOOL ERROR;

@implementation ISN_Logger

+(void) SetLogLevel:(BOOL)info warning:(BOOL)warning error:(BOOL)error {
    INFO = info;
    WARNING = warning;
    ERROR = error;
}

+(void) Log:(NSString *)msg, ... {
    if(INFO) {
        va_list argumentList;
        va_start(argumentList, msg);
        NSString *message = [[NSString alloc] initWithFormat:msg arguments:argumentList];
        
        // clean up
        va_end(argumentList);
        NSLog(@"IOSNative: %@", message);
    }
}

+(void) LogNativeMethodInvoke:(const char* )method data:(const char*) data {
    if(INFO) {
        NSLog(@"IOSNative::Unity->Native method: %@ data: %@", [NSString stringWithUTF8String: method], [NSString stringWithUTF8String: data]);
    }
}

+(void) LogUnityMethodInvoke:(const char* )method data:(NSString*) data {
    if(INFO) {
        NSLog(@"IOSNative::Native->Unity method: %@ data: %@", [NSString stringWithUTF8String: method], data);
    }
}

+(void) LogCallbackInvoke:(NSString*) data {
    if(INFO) {
        NSLog(@"IOSNative::Native->Unity callback data: %@", data);
    }
}


+(void) LogWarning:(NSString *)msg, ... {
    if(WARNING) {
        va_list argumentList;
        va_start(argumentList, msg);
        NSString *message = [[NSString alloc] initWithFormat:msg arguments:argumentList];
        
        // clean up
        va_end(argumentList);
        NSLog(@"IOSNative: %@", message);
    }
}

+(void) LogError:(NSString *)msg, ... {
    if(ERROR) {
        va_list argumentList;
        va_start(argumentList, msg);
        NSString *message = [[NSString alloc] initWithFormat:msg arguments:argumentList];
        
        // clean up
        va_end(argumentList);
        NSLog(@"IOSNative: %@", message);
    }
}



+(void) PrintLog:(NSString *)msg, ... {
    va_list argumentList;
    va_start(argumentList, msg);
    NSString *message = [[NSString alloc] initWithFormat:msg arguments:argumentList];
    
    // clean up
    va_end(argumentList);
    NSLog(@"IOSNative: %@", message);
}

@end

extern "C" {
    void _ISN_SetLogLevel(bool info, bool warning, bool error) {
        NSLog(@"IOSNative::LogLevel -> info:%s  warning:%s error:%s ", info ? "true" : "false", warning ? "true" : "false", error ? "true" : "false");
        [ISN_Logger SetLogLevel:info warning:warning error:error];
    }
    
    void _ISN_NativeLog(char* message) {
        [ISN_Logger PrintLog:[NSString stringWithUTF8String: message]];
    }
}




