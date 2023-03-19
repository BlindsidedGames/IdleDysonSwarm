//
//  PHFetchResult.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-03-26.
//

#import <Foundation/Foundation.h>
#import <Photos/Photos.h>

#import "ISN_Foundation.h"



extern "C" {

    unsigned long _ISN_PHFetchResult_firstObject(unsigned long hash) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_PHFetchResult_firstObject"
                                                  data: ISN_ConvertToChar([NSString stringWithFormat:@"hash %lu", hash])];
        PHFetchResult<PHAsset *> * fetchResult = (PHFetchResult<PHAsset *> *) [ISN_HashStorage Get: hash];
        return [ISN_HashStorage Add:fetchResult.firstObject];
    }
}
