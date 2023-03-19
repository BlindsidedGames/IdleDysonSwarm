////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

#import "ISN_Foundation.h"
#import <AdSupport/ASIdentifierManager.h>

extern "C"
{
    char* _ISN_GetAdvertisingIdentifier()
    {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_GetAdvertisingIdentifier" data:""];
        
        NSUUID *advertisingIdentifier = [[ASIdentifierManager sharedManager] advertisingIdentifier];
        uuid_t uuid;
        [advertisingIdentifier getUUIDBytes:uuid];
        
        NSData *advertisingData = [NSData dataWithBytes:uuid length:16];
        NSString *m_advertisingIdentifier = [advertisingData base64EncodedStringWithOptions:NSDataBase64DecodingIgnoreUnknownCharacters];
        const char* string = [m_advertisingIdentifier UTF8String];
        char* res = (char*)malloc(strlen(string) + 1);
        strcpy(res, string);
        return res;
    }
    
    BOOL _ISN_AdvertisingTrackingEnabled()
    {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_AdvertisingTrackingEnabled" data:""];
        BOOL m_isEnabled = [[ASIdentifierManager sharedManager] isAdvertisingTrackingEnabled];
        return m_isEnabled;
    }
    
}
