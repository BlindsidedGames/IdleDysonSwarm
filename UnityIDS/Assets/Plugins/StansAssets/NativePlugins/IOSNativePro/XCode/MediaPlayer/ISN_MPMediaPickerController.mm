//
//  ISN_MPMediaPickerController.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-04-19.
//

#import "ISN_Foundation.h"
#import <Foundation/Foundation.h>
#import <MediaPlayer/MediaPlayer.h>

@interface MPMediaPickerDelegate :  NSObject<MPMediaPickerControllerDelegate>
@property (nonatomic) UnityAction didCancel;
@property (nonatomic) UnityAction didPickMediaItems;
@property (nonatomic) unsigned long delgateHashId;

@end

@implementation MPMediaPickerDelegate

- (void)mediaPicker:(MPMediaPickerController *)mediaPicker didPickMediaItems:(MPMediaItemCollection *)mediaItemCollection
{
    unsigned long hash = [ISN_HashStorage Add:mediaItemCollection];
    NSString *hashString = [NSString stringWithFormat: @"%lu", hash];
    ISN_SendCallbackToUnity([self didPickMediaItems], hashString);
    [ISN_HashStorage Dispose:[self delgateHashId]];
   
}

- (void)mediaPickerDidCancel:(MPMediaPickerController *)mediaPicker
{
    ISN_SendCallbackToUnity([self didCancel], @"");
    [ISN_HashStorage Dispose:[self delgateHashId]];
}

@end


extern "C" {

    unsigned long _ISN_MPMediaPickerController_Init() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMediaPickerController_Init" data:""];
        MPMediaPickerController *controller = [[MPMediaPickerController alloc] init];
       return [ISN_HashStorage Add:controller];
    }

    bool _ISN_MPMediaPickerController_getAllowsPickingMultipleItems(unsigned long hash) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMediaPickerController_getAllowsPickingMultipleItems"
                                     data: ISN_ConvertToChar([NSString stringWithFormat:@"hash: %lu", hash])];
        MPMediaPickerController *controller = (MPMediaPickerController*) [ISN_HashStorage Get:hash];
        return [controller allowsPickingMultipleItems];
    }
    
    void _ISN_MPMediaPickerController_setAllowsPickingMultipleItems(unsigned long hash, bool allowsPickingMultipleItems) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMediaPickerController_allowsPickingMultipleItems"
                                    data: ISN_ConvertToChar([NSString stringWithFormat:@"allowsPickingMultipleItems: %d", allowsPickingMultipleItems])];

        MPMediaPickerController *controller = (MPMediaPickerController*) [ISN_HashStorage Get:hash];
        [controller setAllowsPickingMultipleItems:allowsPickingMultipleItems];
    }

    void _ISN_MPMediaPickerController_setDelegate(unsigned long hash, UnityAction didCancel, UnityAction didPickMediaItems) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_MPMediaPickerController_setAllowsPickingMultipleItems"
                                     data: ISN_ConvertToChar([NSString stringWithFormat:@"hash: %lu", hash])];

        MPMediaPickerController *controller = (MPMediaPickerController*) [ISN_HashStorage Get:hash];
        MPMediaPickerDelegate *delegate = [[MPMediaPickerDelegate alloc] init];
        
        [delegate setDidCancel:didCancel];
        [delegate setDidPickMediaItems:didPickMediaItems];
        [delegate setDelgateHashId:[ISN_HashStorage Add:delegate]];
        
        [controller setDelegate:delegate];
    }
}
