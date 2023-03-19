# import "ISN_NSCommunication.h"
# import "ISN_Foundation.h"

@interface ISN_NSUbiquitousKeyValueStore : NSObject

- (void) initialize;
- (void)setString:(NSString *) key value:(NSString *)value;
- (ISN_NSKeyValueObject*) requestDataForKey:(NSString*) key;
- (bool) synchronize;

@end

@implementation ISN_NSUbiquitousKeyValueStore

static ISN_NSUbiquitousKeyValueStore * s_storageInstance;

+ (id)storageInstance {
    
    if (s_storageInstance == nil)  {
        s_storageInstance = [[self alloc] init];
        [s_storageInstance initialize];
    }
    return s_storageInstance;
}

-(void) initialize {
    NSUbiquitousKeyValueStore *store = [NSUbiquitousKeyValueStore defaultStore];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(storeDidChange:)
                                                 name:NSUbiquitousKeyValueStoreDidChangeExternallyNotification
                                                    object:store];
}

-(void)setString:(NSString *) key value:(NSString *)value {
    NSUbiquitousKeyValueStore *store = [NSUbiquitousKeyValueStore defaultStore];
    [store setString:value forKey:key];
}

-(ISN_NSKeyValueResult*) requestDataForKey:(NSString* ) key {
    NSUbiquitousKeyValueStore *store = [NSUbiquitousKeyValueStore defaultStore];
    
    id value = [store objectForKey:key];

    ISN_NSKeyValueResult *result;
    if(value == nil) {
        SA_Error *error = [[SA_Error alloc] initWithCode:1 message:@"Not found data by key"];
        result = [[ISN_NSKeyValueResult alloc] initWithError:error];
        
        ISN_NSKeyValueObject *kv = [[ISN_NSKeyValueObject alloc] initWithData:key value:@""];
        [result setM_KeyValueObject:kv];
        
    } else {
        ISN_NSKeyValueObject *object = [[ISN_NSKeyValueObject alloc] initWithData:key value:value];
        result = [[ISN_NSKeyValueResult alloc] initWithNSKeyValueObject:object];
    }
    
    return  result;
}

-(bool) synchronize  {
    return [[NSUbiquitousKeyValueStore defaultStore] synchronize];
}



- (void)storeDidChange:(NSNotification *)notification {
    ISN_NSStoreDidChangeExternallyNotification *updatedData = [[ISN_NSStoreDidChangeExternallyNotification alloc] init];
    
    NSDictionary* userInfo = [notification userInfo];
    NSNumber* reasonForChange = [userInfo objectForKey:NSUbiquitousKeyValueStoreChangeReasonKey];
    
    // If a reason could not be determined, do not update anything.
    if (!reasonForChange)
        return;
    
    updatedData.m_Reason = [reasonForChange intValue];
    NSUbiquitousKeyValueStore* store = [NSUbiquitousKeyValueStore defaultStore];
    NSArray* changedKeys = [userInfo objectForKey:NSUbiquitousKeyValueStoreChangedKeysKey];
    NSMutableArray<ISN_NSKeyValueObject> *updatedKeyValueArray = [[NSMutableArray<ISN_NSKeyValueObject> alloc] init];
    
    for (NSString* key in changedKeys) {
        id value = [store objectForKey:key];
        
        NSString *stringValue = value == nil ? @"null" : (NSString*)value;
        ISN_NSKeyValueObject *object = [[ISN_NSKeyValueObject alloc] initWithData:key value:stringValue];
        [updatedKeyValueArray addObject:object];
    }
    
    [updatedData setM_UpdatedData:updatedKeyValueArray];
    
    ISN_SendMessage(UNITY_CK_LISTENER, "OnStoreDidChange", [updatedData toJSONString]);
}
@end


extern "C" {
    
    void _ISN_SetString(char* key, char* val) {
        NSString* m_key = ISN_ConvertToString(key);
        NSString* m_value = ISN_ConvertToString(val);
        
        [[ISN_NSUbiquitousKeyValueStore storageInstance] setString:m_key value:m_value];
    }
    
    char* _ISN_KeyValueStoreObjectForKey(char * key) {
        ISN_NSKeyValueObject *result = [[ISN_NSUbiquitousKeyValueStore storageInstance] requestDataForKey:ISN_ConvertToString(key)];
        
        [ISN_Logger LogUnityMethodInvoke:"_ISN_KeyValueStoreObjectForKey" data:[result toJSONString]];
        return ISN_ConvertToChar([result toJSONString]);
    }
    
    bool _ISN_Synchronize() {
        return [[ISN_NSUbiquitousKeyValueStore storageInstance] synchronize];
    }
    
    
    void _ISN_iCloud_Reset() {
        NSUbiquitousKeyValueStore *kvStore = [NSUbiquitousKeyValueStore defaultStore];
        NSDictionary *kvd = [kvStore dictionaryRepresentation];
        NSArray *arr = [kvd allKeys];
        for (int i=0; i < arr.count; i++){
            NSString *key = [arr objectAtIndex:i];
            [kvStore removeObjectForKey:key];
        }
        
        _ISN_Synchronize();
    }
    
}



