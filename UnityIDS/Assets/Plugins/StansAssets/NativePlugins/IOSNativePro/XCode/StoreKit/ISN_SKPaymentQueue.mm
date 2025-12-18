//
//  ISN_SKPaymentQueue.m
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
    void _SKPaymentQueue_addPayment(unsigned long paymentHash) {
        [ISN_Logger Log: @"_SKPaymentQueue_addPayment."];
        SKPayment *payment = (SKMutablePayment*) [ISN_HashStorage Get:paymentHash];
        [[SKPaymentQueue defaultQueue] addPayment:payment];
    }
}
