//
//  ISN_NSSortDescriptor.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-03-26.
//

#import <Foundation/Foundation.h>
#import "ISN_Foundation.h"

extern "C" {

    unsigned long _ISN_NSSortDescriptor_Init(char* key, bool ascending) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_NSSortDescriptor_Init"
                                     data: ISN_ConvertToChar([NSString stringWithFormat:@"key: %s", key])];
        NSSortDescriptor *srtDescriptor = [[NSSortDescriptor alloc] initWithKey:[NSString stringWithUTF8String: key] ascending:ascending];
        return [ISN_HashStorage Add:srtDescriptor];
    }
}
