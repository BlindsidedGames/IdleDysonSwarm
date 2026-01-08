#import <Foundation/Foundation.h>

@interface ISN_HashStorage : NSObject
+ (unsigned long) Add: (NSObject *) object;
+ (NSObject *) Get: (unsigned long) key;
+ (void) Dispose: (unsigned long) key;
+ (unsigned long) NullObjectHash;
@end
