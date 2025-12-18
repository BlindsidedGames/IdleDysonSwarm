//
//  ISN_PHAsset.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-03-26.
//

#import <Foundation/Foundation.h>
#import <Photos/Photos.h>

#import "ISN_Foundation.h"



extern "C" {

    unsigned long _ISN_PHAsset_fetchAssetsWithOptions(unsigned long optionsHash) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_PHAsset_fetchAssetsWithOptions"

                                     data: ISN_ConvertToChar([NSString stringWithFormat:@"optionsHash: %lu", optionsHash])];
        PHFetchOptions *fetchOptions = (PHFetchOptions*) [ISN_HashStorage Get:optionsHash];
        PHFetchResult<PHAsset *> * fetchResult = [PHAsset fetchAssetsWithOptions:fetchOptions];
        return [ISN_HashStorage Add:fetchResult];
    }

    char* _ISN_PHAsset_localIdentifier(unsigned long hash) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_PHAsset_localIdentifier"
                                                        data: ISN_ConvertToChar([NSString stringWithFormat:@"hash: %lu", hash])];
        PHAsset *asset = (PHAsset*) [ISN_HashStorage Get:hash];
        return ISN_ConvertToChar(asset.localIdentifier);
    }
}
