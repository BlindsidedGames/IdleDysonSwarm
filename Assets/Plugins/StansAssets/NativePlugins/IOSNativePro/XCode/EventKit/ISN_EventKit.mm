#if !TARGET_OS_TV

#import <Foundation/Foundation.h>
#import <EventKit/EventKit.h>
#import "ISN_EventKit.h"
#import "ISN_Foundation.h"

@interface ISN_EventKit()
@property (strong, nonatomic) EKEventStore *store;
@end

@implementation ISN_EventKit

static ISN_EventKit * s_sharedInstance;
+ (id)sharedInstance {
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    return s_sharedInstance;
}

- (EKEventStore *)store {
    if (!_store) {
        _store = [[EKEventStore alloc] init];
    }
    return _store;
}

/// Request Access and create and remove Event and Reminder.

- (void)requestAccess:(UnityAction *) callback entityType:(EKEntityType) type
{
    [self.store requestAccessToEntityType:type completion:^(BOOL granted, NSError * _Nullable error) {
        if(granted && error == nil)
        {
            SA_Result * result = [[SA_Result alloc] initWithNSError:error];
            ISN_SendCallbackToUnity(callback, [result toJSONString]);
        }
        else
        {
            SA_Result * result = [[SA_Result alloc] initWithNSError:error];
            ISN_SendCallbackToUnity(callback, [result toJSONString]);
        }
    }];
}

- (void)saveEvent:(UnityAction *) callback data:(ISN_EventKitSaveData *) request alarm:(ISN_AlarmData *) alarm recurrenceRule:(ISN_RecurrenceRuleData *) rule
{
    EKEvent *event = [EKEvent eventWithEventStore:self.store];
    event.startDate = [NSDate dateWithTimeIntervalSince1970:request.m_StartDate];
    event.endDate = [NSDate dateWithTimeIntervalSince1970:request.m_EndDate];
    event.title = request.m_Title;
    if(alarm.m_HasAlarm)
    {
        [event addAlarm:[ISN_EventKit getAlarm:alarm]];
    }
    if(rule.m_HasRule)
    {
        [event addRecurrenceRule:[ISN_EventKit getRecurrenceRule:rule]];
    }
    
    [event setCalendar:[self.store defaultCalendarForNewEvents]];
    NSError *error = nil;
    BOOL success = [self.store saveEvent:event span:EKSpanThisEvent commit:YES error:&error];
    ISN_EventKitSaveResult *result = [[ISN_EventKitSaveResult alloc] init];
    result.m_Result = [[SA_Result alloc] initWithNSError: error];
    if(success)
    {
        result.m_Identifier = event.eventIdentifier;
    }
    else
    {
        result.m_Identifier = @"";
    }
    ISN_SendCallbackToUnity(callback, [result toJSONString]);
}

- (void) removeEvent:(UnityAction *) callback identifier:(NSString *) identifier
{
    NSError *error = nil;

    EKEvent *event = [self.store eventWithIdentifier:identifier];
    [self.store removeEvent:event span:EKSpanThisEvent commit:YES error:&error];
    SA_Result *result = [[SA_Result alloc] initWithNSError:error];
    ISN_SendCallbackToUnity(callback, [result toJSONString]);
}

- (void) saveReminder:(UnityAction *) callback data:(ISN_EventKitSaveData *) data alarm:(ISN_AlarmData *) alarm recurrenceRule:(ISN_RecurrenceRuleData *) rule
{
    EKReminder *reminder = [EKReminder reminderWithEventStore:self.store];
    reminder.title = data.m_Title;
    [reminder setCalendar:[self.store defaultCalendarForNewReminders]];
    if(alarm.m_HasAlarm)
    {
        [reminder addAlarm:[ISN_EventKit getAlarm:alarm]];
    }
    if(rule.m_HasRule)
    {
        [reminder addRecurrenceRule:[ISN_EventKit getRecurrenceRule:rule]];
    }
    unsigned unitFlags= NSCalendarUnitYear|NSCalendarUnitMonth | NSCalendarUnitDay | NSCalendarUnitHour |NSCalendarUnitMinute|NSCalendarUnitSecond|NSCalendarUnitTimeZone;
    NSCalendar *calendar = [[NSCalendar alloc]
                            initWithCalendarIdentifier:NSCalendarIdentifierGregorian];
    if(data.m_StartDate != -1)
    {
        NSDateComponents *startDate=[calendar components:unitFlags fromDate:[NSDate dateWithTimeIntervalSince1970:data.m_StartDate]];
        [reminder setStartDateComponents:startDate];
    }
    
    if(data.m_EndDate != -1)
    {
        NSDateComponents *dueDate=[calendar components:unitFlags fromDate:[NSDate dateWithTimeIntervalSince1970:data.m_EndDate]];
        [reminder setDueDateComponents:dueDate];
    }

    NSError *error = nil;
    BOOL success = [self.store saveReminder:reminder commit:YES error:&error];
    ISN_EventKitSaveResult *result = [[ISN_EventKitSaveResult alloc] init];
    result.m_Result = [[SA_Result alloc] initWithNSError:error];
    if(success)
    {
        result.m_Identifier = reminder.calendarItemIdentifier;
    }
    else
    {
        result.m_Identifier = @"";
    }
    ISN_SendCallbackToUnity(callback, [result toJSONString]);
}

- (void) removeReminder:(UnityAction *) callback identifier:(NSString *) identifier
{
    NSError *error = nil;

    EKReminder *reminder = (EKReminder *)[self.store calendarItemWithIdentifier:identifier];
    [self.store removeReminder:reminder commit:YES error:&error];
    SA_Result *result = [[SA_Result alloc] initWithNSError:error];
    ISN_SendCallbackToUnity(callback, [result toJSONString]);
}

/// Create alarm and recurrence rule

+ (EKAlarm *)getAlarm:(ISN_AlarmData *) data
{
    EKAlarm *alarm = nil;
    if(data.m_HasAlarm)
    {
        if(data.m_IsAbsoluteDate)
        {
            NSDate *m_AlarmDate = [NSDate dateWithTimeIntervalSince1970:data.m_DueDate];
            alarm = [EKAlarm alarmWithAbsoluteDate:m_AlarmDate];
        }
        else
        {
            alarm = [EKAlarm alarmWithRelativeOffset:data.m_TimeStamp];
        }
    }
    return alarm;
}

+ (EKRecurrenceRule *) getRecurrenceRule:(ISN_RecurrenceRuleData *) data
{
    EKRecurrenceFrequency frenquency = EKRecurrenceFrequencyDaily;
    if([data.m_Frequency isEqualToString:@"Daily"])
    {
        frenquency = EKRecurrenceFrequencyDaily;
    }
    else if ([data.m_Frequency isEqualToString:@"Weekly"])
    {
        frenquency = EKRecurrenceFrequencyWeekly;
    }
    else if ([data.m_Frequency isEqualToString:@"Monthly"])
    {
        frenquency = EKRecurrenceFrequencyMonthly;
    }
    else if ([data.m_Frequency isEqualToString:@"Yearly"])
    {
        frenquency = EKRecurrenceFrequencyYearly;
    }
    
    EKRecurrenceEnd *endOfRecurrence = nil;
    if(data.m_HasEndDate)
    {
        NSDate *endDate = [NSDate dateWithTimeIntervalSince1970:data.m_EndDate];
        endOfRecurrence = [EKRecurrenceEnd recurrenceEndWithEndDate:endDate];
    }
    
    EKRecurrenceRule *rule = [[EKRecurrenceRule alloc] initRecurrenceWithFrequency:frenquency interval:data.m_Interval end:endOfRecurrence];
    
    return rule;
}

@end

/// Implementation of data objects.

@implementation ISN_EventKitSaveData
-(id) init {return [super init]; }
@end

@implementation ISN_EventKitSaveResult
-(id) init {return [super init]; }
@end

@implementation ISN_AlarmData
-(id) init {return [super init]; }
@end

@implementation ISN_RecurrenceRuleData
-(id) init {return [super init]; }
@end

extern "C" {
    
    void _ISN_EventKitRequestAccess(UnityAction *callback, char* type)
    {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_EventKitRequestAccess" data:""];

        EKEntityType m_type = ([@"Reminder" isEqual: @(type)])? EKEntityTypeReminder: EKEntityTypeEvent;
        [[ISN_EventKit sharedInstance] requestAccess:callback entityType:m_type];
    }
    
    void _ISN_SaveEvent(UnityAction * callback, char* eventData, char * alarmData, char * recurrenceRuleData)
    {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_SaveEvent" data:""];
        NSError *jsonError;
        ISN_EventKitSaveData *request = [[ISN_EventKitSaveData alloc] initWithChar:eventData error:&jsonError];
        if(jsonError)
        {
            [ISN_Logger LogError:@"_ISN_EventData JSON parsing error: %@", jsonError.description];
        }
        ISN_AlarmData *alarm = [[ISN_AlarmData alloc] initWithChar:alarmData error:&jsonError];
        
        ISN_RecurrenceRuleData *recurrenceRule = [[ISN_RecurrenceRuleData alloc] initWithChar:recurrenceRuleData error:&jsonError];
        
        [[ISN_EventKit sharedInstance] saveEvent:callback data:request alarm:alarm recurrenceRule:recurrenceRule];
    }
    
    void _ISN_RemoveEvent(UnityAction * callback, char* identifier)
    {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_RemoveEvent" data:""];
        [[ISN_EventKit sharedInstance] removeEvent:callback identifier:[NSString stringWithUTF8String: identifier]];
    }
    
    void _ISN_SaveReminder(UnityAction * callback, char* reminderData, char * alarmData, char * recurrenceRuleData)
    {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_SaveReminder" data:""];
        NSError *jsonError;
        
        ISN_EventKitSaveData *request = [[ISN_EventKitSaveData alloc] initWithChar:reminderData error:&jsonError];
        if(jsonError)
        {
            [ISN_Logger LogError:@"_ISN_EventData JSON parsing error: %@", jsonError.description];
        }

        ISN_AlarmData *alarm = [[ISN_AlarmData alloc] initWithChar:alarmData error:&jsonError];
        
        ISN_RecurrenceRuleData *recurrenceRule = [[ISN_RecurrenceRuleData alloc] initWithChar:recurrenceRuleData error:&jsonError];
        
        [[ISN_EventKit sharedInstance] saveReminder:callback data:request alarm:alarm recurrenceRule:recurrenceRule];
    }
    
    void _ISN_RemoveReminder(UnityAction * callback, char* identifier)
    {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_RemoveReminder" data:""];
        [[ISN_EventKit sharedInstance] removeReminder:callback identifier:[NSString stringWithUTF8String:identifier]];
    }

}
#endif
