//
//  MPRemoteCommandCenter.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 9/15/18.
//

#import "ISN_Foundation.h"
#import <Foundation/Foundation.h>
#import <MediaPlayer/MediaPlayer.h>

#if !TARGET_OS_TV


static UnityAction OnPlayCommandCallback;
static UnityAction OnPauseCommandCallback;
static UnityAction OnStopCommandCallback;


static UnityAction OnNextTrackCommandCallback;
static UnityAction OnPreviousTrackCommandCallback;


extern "C" {
    
    void ISN_SubscribeToRemoteCommand(MPRemoteCommand * command, UnityAction callback) {
        [command addTargetWithHandler:^MPRemoteCommandHandlerStatus(MPRemoteCommandEvent * _Nonnull event) {
            
            NSLog(@"comman executed: %@ Sending the callback to unity ", event.command.description);
            
            SA_Result* result = [[SA_Result alloc] init];
            ISN_SendCallbackToUnity(callback, [result toJSONString]);
            
            NSLog(@"Callback sent: %@", callback);
            
            return MPRemoteCommandHandlerStatusSuccess;
        }];
    }
    
    void _ISN_MP_OnPlayCommand(UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MP_OnPlayCommand" data:""];
        OnPlayCommandCallback = callback;
        
        ISN_SubscribeToRemoteCommand([MPRemoteCommandCenter sharedCommandCenter].playCommand, OnPlayCommandCallback);
        
    }
    
    
    void _ISN_MP_OnPauseCommand(UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MP_OnPauseCommand" data:""];
        OnPauseCommandCallback = callback;
        
        ISN_SubscribeToRemoteCommand([MPRemoteCommandCenter sharedCommandCenter].pauseCommand, OnPauseCommandCallback);
    }
    
    void _ISN_MP_OnStopCommand(UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MP_OnStopCommand" data:""];
        OnStopCommandCallback = callback;
        
        ISN_SubscribeToRemoteCommand([MPRemoteCommandCenter sharedCommandCenter].stopCommand, OnStopCommandCallback);
    }
    
    
    
    
    void _ISN_MP_OnNextTrackCommand(UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MP_OnNextTrackCommand" data:""];
        OnNextTrackCommandCallback = callback;
        
        ISN_SubscribeToRemoteCommand([MPRemoteCommandCenter sharedCommandCenter].nextTrackCommand, OnNextTrackCommandCallback);
    }
    
    void _ISN_MP_OnPreviousTrackCommand(UnityAction callback) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MP_OnPreviousTrackCommand" data:""];
        OnPreviousTrackCommandCallback = callback;
        
        ISN_SubscribeToRemoteCommand([MPRemoteCommandCenter sharedCommandCenter].previousTrackCommand, OnPreviousTrackCommandCallback);
    }
    
    
    
}



#endif
