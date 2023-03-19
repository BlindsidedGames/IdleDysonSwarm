//
//  ISN_UIMenuController.m
//  Unity-iPhone
//
//  Created by Roman on 25.06.2020.
//
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import "ISN_Foundation.h"

static UnityAction *UIMenuControllerCallback;

#pragma mark - Request and Result interfaces

@interface ISN_UIMenuControllerRequest : JSONModel
@property (nonatomic) NSArray <NSString *> *m_MenuItems;
@property (nonatomic) float m_xPos;
@property (nonatomic) float m_yPos;
@end

@interface ISN_UIMenuControllerResult : JSONModel
@property (nonatomic) NSInteger m_ChosenIndex;
@end

@implementation ISN_UIMenuControllerRequest
-(id) init { return [super init]; }
@end

@implementation ISN_UIMenuControllerResult
-(id) init { return [super init]; }
@end

#pragma mark - Controller

@interface ISN_UIMenuController : UIView
@end

@interface ISN_UIMenuController()
@property NSArray<NSString *> *items;
@end

@implementation ISN_UIMenuController
static ISN_UIMenuController * s_sharedInstance;
+ (id)sharedInstance {
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    return s_sharedInstance;
}

- (BOOL) canPerformAction:(SEL)action withSender:(id)sender {
    NSString *sel = NSStringFromSelector(action);
    NSRange match = [sel rangeOfString:@"action_"];
    if (match.location == 0) {
        return YES;
    }
    return NO;
}

- (BOOL)canBecomeFirstResponder {
    return YES;
}

- (void)showWithMenuItems:(NSArray<NSString *> *)items atPositionX:(float)xPos atPostionY:(float)yPos {
#if !TARGET_OS_TV
    CGFloat scale = [UIScreen mainScreen].scale;
    CGRect rect = CGRectMake(((CGFloat)xPos)/scale, ((CGFloat)yPos)/scale, 0, 0);
    self.frame = rect;
    self.items = [[NSArray alloc] initWithArray:items];
    UIViewController *vc =  UnityGetGLViewController();
    [vc.view addSubview:self];
    [self becomeFirstResponder];
    NSMutableArray<UIMenuItem *> *menuItems = [[NSMutableArray alloc] init];
    
    for (NSString *item in self.items) {
        NSString *sel = [NSString stringWithFormat:@"action_%@", item];
        UIMenuItem *menuItem = [[UIMenuItem alloc] init];
        [menuItem setTitle:item];
        [menuItem setAction:NSSelectorFromString(sel)];
        [menuItems addObject:menuItem];
    }
    
    UIMenuController *shared = UIMenuController.sharedMenuController;
    shared.menuItems = menuItems;
    if (@available(iOS 13.0, *)) {
        [shared showMenuFromView:self.superview rect:self.frame];
    } else {
        [shared setTargetRect:self.frame inView:[self superview]];
        [shared setMenuVisible:true animated:true];
    }
#endif
}

- (void)tappedMenuItem:(NSString *)menuItem {
    ISN_UIMenuControllerResult *result = [[ISN_UIMenuControllerResult alloc] init];
    result.m_ChosenIndex = (NSInteger)[self.items indexOfObject:menuItem];
    [self removeFromSuperview];
    printf("Result is - %lu\n", result.m_ChosenIndex);
    ISN_SendCallbackToUnity(UIMenuControllerCallback, [result toJSONString]);
}

- (NSMethodSignature *)methodSignatureForSelector:(SEL)sel {
    if ([super methodSignatureForSelector:sel]) {
        return [super methodSignatureForSelector:sel];
    }
    return [super methodSignatureForSelector:@selector(tappedMenuItem:)];
}

- (void)forwardInvocation:(NSInvocation *)invocation {
    NSString *sel = NSStringFromSelector([invocation selector]);
    NSRange match = [sel rangeOfString:@"action_"];
    if (match.location == 0) {
        [self tappedMenuItem:[sel substringFromIndex:7]];
    } else {
        [super forwardInvocation:invocation];
    }
}

@end

extern "C" {
    void _ISN_UIMenuController(UnityAction *callback, char* data) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UIMenuController" data:data];
        
        NSError *jsonError;
        ISN_UIMenuControllerRequest *request = [[ISN_UIMenuControllerRequest alloc] initWithChar:data error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_UIMenuController JSON parsing error: %@", jsonError.description];
        }
        UIMenuControllerCallback = callback;
        [[ISN_UIMenuController sharedInstance] showWithMenuItems:request.m_MenuItems
                                                     atPositionX:request.m_xPos
                                                      atPostionY:request.m_yPos];
    }
}
