//
//  Created by Stanislav Osipov on 2020-01-02.
//

#import "ISN_HashStorage.h"
@implementation ISN_HashStorage

static NSMutableDictionary * s_objectsMap = nil;
+ (NSMutableDictionary *) ObjectsMap {
    if(s_objectsMap == nil) {
        s_objectsMap = [[NSMutableDictionary alloc] init];
    }
    
    return s_objectsMap;
}

+ (unsigned long) Add: (NSObject *) object {
    if(object == nil) {
        NSLog(@"ISN_HashStorage: Can't Add NULL object!");
    }
    
   
    NSUInteger hashCode = [object hash];
    
    NSString *stringKey = [NSString stringWithFormat: @"%lu",  (unsigned long)hashCode];
    if([self GetFromStringKey:stringKey] == nil) {
         NSLog(@"ISN_HashStorage: Object Added %@ with key %@", object, stringKey);
         [[self ObjectsMap] setValue:object forKey:stringKey];
    }

    return (unsigned long) hashCode;
}

+(unsigned long) NullObjectHash {
    return 0;
}

+ (NSObject *) Get: (unsigned long) key {
    NSString *stringKey = [NSString stringWithFormat: @"%lu", key];
    return [self GetFromStringKey:stringKey];
}

+ (NSObject *) GetFromStringKey: (NSString*) stringKey {
     return [[self ObjectsMap] valueForKey:stringKey];
}

+ (void)Dispose:(unsigned long)key {
    NSString *stringKey = [NSString stringWithFormat: @"%lu",  (unsigned long)key];
    [[self ObjectsMap] removeObjectForKey:stringKey];
}
@end

extern "C" {
    void _ISN_HashStorage_Dispose(unsigned long key) {
        [ISN_HashStorage Dispose:key];
    }
}
