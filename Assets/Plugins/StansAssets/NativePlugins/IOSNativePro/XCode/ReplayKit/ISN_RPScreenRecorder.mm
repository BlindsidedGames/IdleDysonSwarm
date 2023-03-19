//
//  ISN_ReplayKit.m
//  Unity-iPhone
//
//  Created by lacost on 9/18/15.


#import <Foundation/Foundation.h>
#import <ReplayKit/ReplayKit.h>


#include "ISN_Foundation.h"
#include "ISN_RPCommunication.h"
#include "ISN_RPPreviewViewControllerDelegate.h"
#include "UnityAppController.h"




@interface ISN_RPScreenRecorderDelegate : NSObject <RPScreenRecorderDelegate>

@end


@interface ISN_RPScreenRecorder : NSObject


@property (nonatomic, strong) ISN_RPScreenRecorderDelegate* screenRecorderDelegate;
@property (nonatomic, strong) ISN_RPPreviewViewControllerDelegate* previewDelegate;
@property (nonatomic, strong) RPPreviewViewController* previewViewController;

+ (id) sharedInstance;

- (void) startRecording;
- (void) stopRecording;
- (void) discardRecording;
- (void) showVideoShareDialog;

@end

@implementation ISN_RPScreenRecorder

static ISN_RPScreenRecorder * s_sharedInstance;
+ (id)sharedInstance {
    
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    return s_sharedInstance;
}

-(id) init {
    if(self = [super init]){
        [self setScreenRecorderDelegate:[[ISN_RPScreenRecorderDelegate alloc] init]];
        [RPScreenRecorder sharedRecorder].delegate = self.screenRecorderDelegate;
    }
    return self;
}


- (void) startRecording {

    [[RPScreenRecorder sharedRecorder] startRecordingWithHandler:^(NSError * _Nullable error) {  
        SA_Result* result = [[SA_Result alloc] initWithNSError:error];
        ISN_SendMessage(UNITY_RP_LISTENER, "OnRecorStartResult", [result toJSONString]);
       
    }];
}

- (void) stopRecording {
    [[RPScreenRecorder sharedRecorder] stopRecordingWithHandler:^(RPPreviewViewController * _Nullable previewViewController, NSError * _Nullable error) {
        
        ISN_RPStopResult* result = [self StopResultWithPreviewViewController:previewViewController error:error];
        ISN_SendMessage(UNITY_RP_LISTENER, "OnRecorStopResult", [result toJSONString]);
    }];
}


- (void) discardRecording {
    [[RPScreenRecorder sharedRecorder] discardRecordingWithHandler:^{
        ISN_SendMessage(UNITY_RP_LISTENER, "OnRecordDiscard", @"");
    }];
}


-(void) showVideoShareDialog {
    if([self previewViewController] ==  NULL) {
        [ISN_Logger LogError:@"ISN_RPScreenRecorder  Preview controller is null"];
        return;
    }
    
    self.previewDelegate =[[ISN_RPPreviewViewControllerDelegate alloc] init];
    [self previewViewController].previewControllerDelegate = self.previewDelegate;
    
    RPPreviewViewController *vc =  [self previewViewController];
    
   #if PLATFORM_TVOS
           vc.modalPresentationStyle = UIModalPresentationFullScreen;
   #else
           vc.modalPresentationStyle = UIModalPresentationPopover;
           if (UI_USER_INTERFACE_IDIOM() == UIUserInterfaceIdiomPad)
           {
               vc.popoverPresentationController.sourceRect = CGRectMake(GetAppController().rootView.bounds.size.width / 2, 0, 0, 0);
               vc.popoverPresentationController.sourceView = GetAppController().rootView;
           }
   #endif

    [UnityGetGLViewController() presentViewController: vc animated: YES completion: nil];
}


-(ISN_RPStopResult* ) StopResultWithPreviewViewController:(RPPreviewViewController *)previewViewController error:(NSError *)error {
    
    ISN_RPStopResult* result =  [[ISN_RPStopResult alloc] initWithNSError:error];
    if(previewViewController != NULL) {
        [result setM_HasPreviewController:true];
        [self setPreviewViewController:previewViewController];
    }
    
    return result;
}

@end



@implementation ISN_RPScreenRecorderDelegate

-(id) init {
    if(self = [super init]){
        
    }
    return self;
}


- (void)screenRecorder:(RPScreenRecorder *)screenRecorder didStopRecordingWithPreviewViewController:(nullable RPPreviewViewController *)previewViewController error:(nullable NSError *)error {
    
    ISN_RPStopResult* result = [[ISN_RPScreenRecorder sharedInstance] StopResultWithPreviewViewController:previewViewController error:error];
    ISN_SendMessage(UNITY_RP_LISTENER, "OnRecorderStopRecordingWithError", [result toJSONString]);
}

//Called when the recorder becomes available or stops being available.
//Check the screen recorder's availability property to check the current availability state.
//Possible reasons for the recorder to be unavailable include an in-progress Airplay/TVOut session or unsupported hardware.
- (void)screenRecorderDidChangeAvailability:(RPScreenRecorder *)screenRecorder {
    ISN_SendMessage(UNITY_RP_LISTENER, "OnRecorderDidChangeAvailability", @"");
}



@end


extern "C" {
    
    void _ISN_StartRecording ()  {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_StartRecording" data:""];

        [[ISN_RPScreenRecorder sharedInstance] startRecording];
    }
    
    void _ISN_StopRecording () {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_StopRecording" data:""];

        [[ISN_RPScreenRecorder sharedInstance] stopRecording];
    }
    
    void _ISN_ShowVideoShareDialog () {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_ShowVideoShareDialog" data:""];

        [[ISN_RPScreenRecorder sharedInstance] showVideoShareDialog];
    }
    
    void _ISN_DiscardRecording () {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_DiscardRecording" data:""];

        [[ISN_RPScreenRecorder sharedInstance] discardRecording];
    }
    
    BOOL _ISN_IsReplayKitAvaliable() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_IsReplayKitAvaliable" data:""];

        return   [[RPScreenRecorder sharedRecorder] isAvailable];
    }
    
    BOOL _ISN_IsReplayKitRecording() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_IsReplayKitRecording" data:""];

        return   [[RPScreenRecorder sharedRecorder] isRecording];
    }
    
    BOOL _ISN_IsReplayKitMicEnabled() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_IsReplayKitMicEnabled" data:""];

#if !TARGET_OS_TV
        return   [[RPScreenRecorder sharedRecorder] isMicrophoneEnabled];
#else
        return false;
#endif
    }
    
    
    void _ISN_SetMicrophoneEnabled(BOOL enabled) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_SetMicrophoneEnabled" data:""];
#if !TARGET_OS_TV
        [[RPScreenRecorder sharedRecorder] setMicrophoneEnabled:enabled];
#endif
    }
}
