//
//  ISN_CloudKitContainer.m
//  Unity-iPhone
//
//  Created by Roman on 30.09.2020.
//

#import <CloudKit/CloudKit.h>
#import "ISN_CKCommunication.h"

@interface ISN_CloudKitContainer()
@property UnityAction *eventCallback;
@end

@implementation ISN_CloudKitContainer

+ (ISN_CloudKitContainer *)sharedInstance {
    static dispatch_once_t onceToken = 0;
    static ISN_CloudKitContainer *_sharedInstance = nil;
    
    dispatch_once(&onceToken, ^{
        _sharedInstance = [[ISN_CloudKitContainer alloc] init];
    });
    
    return _sharedInstance;
}

- (instancetype)init
{
    if (self = [super init]) {
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(accountChangedNotification:) name:CKAccountChangedNotification object:nil];
    }
    return self;
}

- (void)setCallback:(UnityAction *)callback {
    self.eventCallback = callback;
}

- (void)accountChangedNotification:(NSNotification *)notification {
    NSLog(@"Account status changed.");
    ISN_SendCallbackToUnity(self.eventCallback, @"");
}

@end
