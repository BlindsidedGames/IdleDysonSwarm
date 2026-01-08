//
//  ISN_MPMediaPickerController.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-04-19.
//

#include "ISN_Foundation.h"
#include "UnityAppController.h"

#import <UIKit/UIKit.h>
#import <Foundation/Foundation.h>


extern "C" {

    void _ISN_UIViewController_setModalPresentationStyle(unsigned long hash, UIModalPresentationStyle presentationStyle) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UIViewController_setModalPresentationStyle"
                                     data: ISN_ConvertToChar([NSString stringWithFormat:@"presentationStyle: %ld", (long)presentationStyle])];

        UIViewController *controller = (UIViewController*) [ISN_HashStorage Get:hash];
        controller.modalPresentationStyle = presentationStyle;
                controller.modalPresentationStyle = presentationStyle;
#if !TARGET_OS_TV
        if(presentationStyle == UIModalPresentationPopover) {
            controller.popoverPresentationController.sourceRect = CGRectMake(GetAppController().rootView.bounds.size.width / 2, 0, 0, 0);
            controller.popoverPresentationController.sourceView = GetAppController().rootView;
        }
#endif
    }

    UIModalPresentationStyle _ISN_UIViewController_getModalPresentationStyle(unsigned long hash) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UIViewController_getModalPresentationStyle"
                                     data: ISN_ConvertToChar([NSString stringWithFormat:@"hash: %lu", hash])];
        UIViewController *controller = (UIViewController*) [ISN_HashStorage Get:hash];
        return controller.modalPresentationStyle;
    }

    void _ISN_UIViewController_presentViewController(unsigned long hash, bool animated, UnityAction callback) {
        
        [ISN_Logger LogNativeMethodInvoke:"_ISN_UIViewController_presentViewController"
                                     data: ISN_ConvertToChar([NSString stringWithFormat:@"hash: %lu, animated: %d", hash, animated])];
        
        UIViewController *controller = (UIViewController*) [ISN_HashStorage Get:hash];
        UIViewController* unityGLViewController = UnityGetGLViewController();
        [unityGLViewController presentViewController:controller animated:animated completion:^{
             ISN_SendCallbackToUnity(callback, @"");
        }];
    }

    void _ISN_UIViewController_dismissViewControllerAnimated(unsigned long hash, bool animated, UnityAction callback) {
        UIViewController *controller = (UIViewController*) [ISN_HashStorage Get:hash];
        [controller dismissViewControllerAnimated:animated completion:^{
            ISN_SendCallbackToUnity(callback, @"");
        }];
    }
}
