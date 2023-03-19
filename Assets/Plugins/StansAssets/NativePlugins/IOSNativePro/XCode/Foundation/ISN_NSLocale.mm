#import <Foundation/Foundation.h>
#import "ISN_Foundation.h"
#import "ISN_NSCommunication.h"



extern "C" {
    
    char*  _ISN_NS_Locale_PreferredLanguage() {
        NSString * language = [[NSLocale preferredLanguages] firstObject];
        return ISN_ConvertToChar(language);
    }
    
    char* _ISN_NS_Locale_CurrentLocale() {
        NSLocale* locale = NSLocale.currentLocale;
        ISN_NSLocale* isn_locale = [[ISN_NSLocale alloc] initWithNSLocale:locale];
        return ISN_ConvertToChar([isn_locale toJSONString]);
    }
    
    char* _ISN_NS_Locale_AutoupdatingCurrentLocale() {
        NSLocale* locale = NSLocale.autoupdatingCurrentLocale;
        ISN_NSLocale* isn_locale = [[ISN_NSLocale alloc] initWithNSLocale:locale];
        return ISN_ConvertToChar([isn_locale toJSONString]);
    }
}


