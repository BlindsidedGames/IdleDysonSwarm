#import <Foundation/Foundation.h>
#import "ISN_Foundation.h"

@interface ISN_NSTimeZone : JSONModel
@property(nonatomic) NSString *m_Name;
@property(nonatomic) NSString *m_Description;
@property(nonatomic) NSInteger m_SecondsFromGmt;

-(id) initWithNSTimeZone:(NSTimeZone *) timeZone;
@end

@implementation ISN_NSTimeZone
-(id) init { return self = [super init]; }
-(id) initWithNSTimeZone:(NSTimeZone *) timeZone {
    self = [super init];
    if(self) {
        self.m_Name = timeZone.name;
        self.m_Description = timeZone.description;
        self.m_SecondsFromGmt = timeZone.secondsFromGMT;

    }
    return self;
}

@end

extern "C" {

    char* _ISN_NS_TimeZone_LocalTimeZone() {
        NSTimeZone* zone = NSTimeZone.localTimeZone;
        ISN_NSTimeZone *timeZone = [[ISN_NSTimeZone alloc] initWithNSTimeZone:zone];

        return ISN_ConvertToChar([timeZone toJSONString]);
    }

    char* _ISN_NS_TimeZone_SystemTimeZone() {
        NSTimeZone* zone = NSTimeZone.systemTimeZone;
        ISN_NSTimeZone *timeZone = [[ISN_NSTimeZone alloc] initWithNSTimeZone:zone];

        return ISN_ConvertToChar([timeZone toJSONString]);
    }

    char* _ISN_NS_TimeZone_DefaultTimeZone() {
        NSTimeZone* zone = NSTimeZone.defaultTimeZone;
        ISN_NSTimeZone *timeZone = [[ISN_NSTimeZone alloc] initWithNSTimeZone:zone];

        return ISN_ConvertToChar([timeZone toJSONString]);
    }

    void _ISN_NS_TimeZone_ResetSystemTimeZone() {
        [NSTimeZone resetSystemTimeZone];
    }
}


