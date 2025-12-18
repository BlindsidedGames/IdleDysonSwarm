#include "ISN_SKProductsRequestDelegate.h"
#import <Foundation/Foundation.h>


#define kInAppPurchaseManagerProductsFetchedNotification @"kInAppPurchaseManagerProductsFetchedNotification"


@implementation ISN_SKProductsRequestDelegate

-(id) init {
    if(self = [super init]){
        [self setProducts:[[NSMutableDictionary alloc] init]];
    }
    return self;
}

- (void)productsRequest:(nonnull SKProductsRequest *)request didReceiveResponse:(nonnull SKProductsResponse *)response {
    
    [ISN_Logger Log: @"ISN_SKProductsRequestDelegate loaded products count: %i", [response.products count]];
    
    for (SKProduct *product in response.products) {
        [self.products setObject:product forKey:product.productIdentifier];
    }
    
    ISN_SKInitResult *result =  [[ISN_SKInitResult alloc] initWithSKProductsRespons:response];
    ISN_SendMessage(UNITY_SK_LISTENER, "OnStoreKitDidReceiveResponse", [result toJSONString]);
    [[NSNotificationCenter defaultCenter] postNotificationName:kInAppPurchaseManagerProductsFetchedNotification object:self userInfo:nil];
}

- (void)request:(SKRequest *)request didFailWithError:(NSError *)error {
    ISN_SKInitResult* result = [[ISN_SKInitResult alloc] initWithNSError:error];
    ISN_SendMessage(UNITY_SK_LISTENER, "OnStoreKitDidReceiveResponse", [result toJSONString]);
}


@end
