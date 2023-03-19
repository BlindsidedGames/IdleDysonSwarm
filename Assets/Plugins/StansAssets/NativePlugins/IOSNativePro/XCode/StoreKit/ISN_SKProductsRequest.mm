//
//  ISN_SKProductsRequest.m
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


@interface ISN_RequestDelegate : NSObject <SKProductsRequestDelegate>
@property (nonatomic) UnityAction didReceiveResponse;

@end


@implementation ISN_RequestDelegate


- (void)productsRequest:(nonnull SKProductsRequest *)request didReceiveResponse:(nonnull SKProductsResponse *)response {
    [ISN_Logger Log: @"ISN_RequestDelegate->didReceiveResponse loaded products count: %i", [response.products count]];

    ISN_SKInitResult *result =  [[ISN_SKInitResult alloc] initWithSKProductsRespons:response];
    ISN_SendCallbackToUnity(self.didReceiveResponse, [result toJSONString]);


    //Release delegate
    [ISN_HashStorage Dispose:self.hash];
}

@end


extern "C" {


    void _SKProductsRequest_start(char * data, UnityAction didReceiveResponse) {


        [ISN_Logger LogNativeMethodInvoke:"_ISN_LoadStore" data:data];

        NSError *jsonError;
        ISN_LoadStoreRequest *request = [[ISN_LoadStoreRequest alloc] initWithChar:data error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_LoadStore JSON parsing error: %@", jsonError.description];
        }


        ISN_RequestDelegate* delegate = [[ISN_RequestDelegate alloc] init];

        //Retain delegate
        [ISN_HashStorage Add:delegate];

        [delegate setDidReceiveResponse:didReceiveResponse];

        SKProductsRequest *skProductsRequest= [[SKProductsRequest alloc] initWithProductIdentifiers:[NSSet setWithArray:request.ProductIdentifiers]];
        skProductsRequest.delegate = delegate;
        [skProductsRequest start];
    }
}
