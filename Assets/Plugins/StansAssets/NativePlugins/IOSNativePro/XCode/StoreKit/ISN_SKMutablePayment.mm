//
//  ISN_SKMutablePayment.m
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
    
    unsigned long _SKMutablePayment_paymentWithProduct(unsigned long productHash) {
        SKProduct* product = (SKProduct*) [ISN_HashStorage Get:productHash];
        SKMutablePayment *payment = [SKMutablePayment paymentWithProduct:product];
        return [ISN_HashStorage Add:payment];
    }
    
    void _SKMutablePayment_setApplicationUsername(unsigned long paymentHash, char* applicationUsername) {
        SKMutablePayment *payment = (SKMutablePayment*) [ISN_HashStorage Get:paymentHash];
        [payment setApplicationUsername:[NSString stringWithUTF8String: applicationUsername]];
    }
    
    void _SKMutablePayment_setPaymentDiscount(unsigned long paymentHash, unsigned long paymentDiscountHash) {
        if (@available(iOS 12.2, *)) {
            SKMutablePayment *payment = (SKMutablePayment*) [ISN_HashStorage Get:paymentHash];
            SKPaymentDiscount *paymentDiscount = (SKPaymentDiscount*) [ISN_HashStorage Get:paymentDiscountHash];
            
            [payment setPaymentDiscount:paymentDiscount];
        }
    }
}

