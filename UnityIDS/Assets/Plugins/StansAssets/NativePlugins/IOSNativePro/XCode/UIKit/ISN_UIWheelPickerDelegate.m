#if !TARGET_OS_TV
#import "ISN_UIWheelPickerDelegate.h"
#import "ISN_UICommunication.h"

@interface ISN_UIWheelPickerDelegate()
@property (nonatomic) NSArray<NSString *> *m_array;
@property (nonatomic) UnityAction callback;
@end

@implementation ISN_UIWheelPickerDelegate

-(void)init:(UnityAction *)callback data:(NSArray<NSString *> *)m_array defaultValue:(int)m_default
{
    self.callback = callback;
    self.m_array = m_array;
    self.m_value = self.m_array[m_default];
}

-(NSInteger)pickerView:(UIPickerView *)pickerView numberOfRowsInComponent:(NSInteger)component{
    return self.m_array.count;
}

- (NSInteger)numberOfComponentsInPickerView:(UIPickerView *)pickerView{
    return 1;
}

-(NSString *)pickerView:(UIPickerView *)pickerView titleForRow:(NSInteger)row forComponent:(NSInteger)component{
    return [self.m_array objectAtIndex:row];
}

-(void)pickerView:(UIPickerView *)pickerView didSelectRow:(NSInteger)row inComponent:(NSInteger)component{
    ISN_UIWheelPickerResult *ressult = [[ISN_UIWheelPickerResult alloc] init];
    self.m_value = self.m_array[row];
    ressult.m_Value = self.m_value;
    ressult.m_State = @"InProgress";
    ISN_SendCallbackToUnity(self.callback, [ressult toJSONString]);
}

@end

#endif
