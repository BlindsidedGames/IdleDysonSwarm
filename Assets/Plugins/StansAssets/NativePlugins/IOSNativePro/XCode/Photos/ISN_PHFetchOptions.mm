//
//  ISN_PHFetchOptions.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-03-26.
//

#import <Foundation/Foundation.h>
#import <Photos/Photos.h>

#import "ISN_Foundation.h"



extern "C" {

    unsigned long _ISN_PHFetchOption_Init() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_PHFetchOption_Init" data:""];
        PHFetchOptions *fetchOptions = [[PHFetchOptions alloc] init];
        return [ISN_HashStorage Add:fetchOptions];
    }

    void _ISN_PHFetchOption_setFetchLimit(unsigned long hash, int fetchLimit) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_PHFetchOption_setFetchLimit"
                                     data: ISN_ConvertToChar([NSString stringWithFormat:@"hash %lu fetchLimit: %d", hash, fetchLimit])];
        PHFetchOptions *fetchOptions = (PHFetchOptions*) [ISN_HashStorage Get:hash];
        [fetchOptions setFetchLimit:fetchLimit];
    }

    void _ISN_PHFetchOption_setSortDescriptor(unsigned long hash, unsigned long descriptorHash) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_PHFetchOption_setSortDescriptor"
                                           data: ISN_ConvertToChar([NSString stringWithFormat:@"hash %lu descriptorHash: %lu", hash, descriptorHash])];
        PHFetchOptions *fetchOptions = (PHFetchOptions*) [ISN_HashStorage Get:hash];
        NSSortDescriptor *sortDescriptor  = (NSSortDescriptor*) [ISN_HashStorage Get:descriptorHash];
        [fetchOptions setSortDescriptors: [NSArray arrayWithObject:sortDescriptor]];
    }
}
