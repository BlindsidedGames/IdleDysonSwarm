
#import <Foundation/Foundation.h>
#import <EventKit/EventKit.h>
#import "ISN_Foundation.h"

@interface ISN_EventKit : NSObject
@end

@protocol ISN_EventKitSaveResult;
@interface ISN_EventKitSaveResult : JSONModel
@property (nonatomic) NSString *m_Identifier;
@property (nonatomic) SA_Result *m_Result;
@end

@protocol ISN_EventKitSaveData;
@interface ISN_EventKitSaveData : JSONModel
@property (nonatomic) NSString *m_Title;
@property (nonatomic) long m_StartDate;
@property (nonatomic) long m_EndDate;
@end

@protocol ISN_AlarmData;
@interface ISN_AlarmData : JSONModel
@property (nonatomic) BOOL m_HasAlarm;
@property (nonatomic) BOOL m_IsAbsoluteDate;
@property (nonatomic) long m_DueDate;
@property (nonatomic) long m_TimeStamp;
@end

@protocol ISN_RecurrenceRuleData;
@interface ISN_RecurrenceRuleData : JSONModel
@property (nonatomic) BOOL m_HasRule;
@property (nonatomic) NSString *m_Frequency;
@property (nonatomic) int m_Interval;
@property (nonatomic) BOOL m_HasEndDate;
@property (nonatomic) long m_EndDate;
@end
