//
//  NSNotificationCenter.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 1/9/19.
//

#import <Foundation/Foundation.h>
#import "JSONModel.h"
#import "ISN_Foundation.h"

@protocol ISN_NSNotification;
@interface ISN_NSNotification : JSONModel
@property NSString *m_Name;

-(id) initWithNSNotification:(NSNotification *) notification;
@end



@implementation ISN_NSNotification
-(id) init { return self = [super init]; }
-(id) initWithNSNotification:(NSNotification *) notification  {
    self = [super init];
    if(self) {
        self.m_Name = notification.name;
    }
    return self;
}
@end


extern "C" {


    void _ISN_NSNotificationCenter_AddObserverForName(char* name, UnityAction callback) {


        [ISN_Logger LogNativeMethodInvoke:"_ISN_NSNotificationCenter_AddObserverForName" data:name];

        NSString* notificationName =  ISN_ConvertToString(name);
        [[NSNotificationCenter defaultCenter] addObserverForName:notificationName
                                                          object:nil
                                                           queue:nil
                                                      usingBlock:^(NSNotification * _Nonnull note) {

                                                          ISN_NSNotification *isn_note = [[ISN_NSNotification alloc] initWithNSNotification:note];
                                                          ISN_SendCallbackToUnity(callback, [isn_note toJSONString]);

                                                      }];

    }


}
