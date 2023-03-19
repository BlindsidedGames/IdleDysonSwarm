//
//  ISN_SKPaymentDiscount.m
//  UnityFramework
//
//  Created by Stanislav Osipov on 01.03.2021.
//

#import <Foundation/Foundation.h>
#import "ISN_Foundation.h"
#import "ISN_HashStorage.h"
#import "ISN_SKCommunication.h"
#import "ISN_Logger.h"
#import <StoreKit/StoreKit.h>


extern "C" {
    
    unsigned long _SKPaymentDiscount_initWithIdentifier(char* identifier, char* keyIdentifier, char *nonce, char* signature, unsigned long timestamp) {
                       
        [ISN_Logger Log: @"_SKPaymentDiscount_initWithIdentifier...."];

        if (@available(iOS 12.2, *)) {
     
            NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:[NSString stringWithUTF8String: nonce]];
            NSNumber * numberValue = [NSNumber numberWithUnsignedLongLong:timestamp];
      
            SKPaymentDiscount *paymentDiscount = [[SKPaymentDiscount alloc] initWithIdentifier:[NSString stringWithUTF8String: identifier] keyIdentifier:[NSString stringWithUTF8String: identifier] nonce:uuid signature:[NSString stringWithUTF8String: identifier] timestamp:numberValue];
            
            return [ISN_HashStorage Add:paymentDiscount];
        } else {
            return [ISN_HashStorage NullObjectHash];
        }
    }
}
