#import "ISN_SKCommunication.h"
#import "ISN_Logger.h"
#import <StoreKit/StoreKit.h>



@interface ISN_SKReceiptDictionary : JSONModel
@property (nonatomic)  NSArray<NSNumber*> *m_Keys;
@property (nonatomic)  NSArray<NSNumber*> *m_Values;
@end



@implementation ISN_SKReceiptDictionary


@end

@interface ISN_SKRequestDelegate : NSObject<SKRequestDelegate>
@property (nonatomic)  UnityAction callback;
@end

@implementation ISN_SKRequestDelegate


- (void)request:(SKRequest *)request didFailWithError:(NSError *)error {
    SA_Result* result = [[SA_Result alloc] initWithNSError:error];
    ISN_SendCallbackToUnity(self.callback, [result toJSONString]);
}

- (void)requestDidFinish:(SKRequest *)request  {
    SA_Result* result = [[SA_Result alloc] init];
    ISN_SendCallbackToUnity(self.callback, [result toJSONString]);
}

@end

static ISN_SKRequestDelegate* requestDelegate;

extern "C" {

    void _ISN_SK_RefreshRequest(char * data, UnityAction callback) {

        [ISN_Logger LogNativeMethodInvoke:"ISN_SK_RefreshRequest" data:data];
        NSError *jsonError;
        ISN_SKReceiptDictionary *request = [[ISN_SKReceiptDictionary alloc] initWithChar:data error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_LoadStore JSON parsing error: %@", jsonError.description];
        }

        SKReceiptRefreshRequest * refreshRequest;

        if(request.m_Keys.count == 0) {
            refreshRequest = [[SKReceiptRefreshRequest alloc] initWithReceiptProperties:nil];
        } else {

            NSMutableDictionary *dic = [[NSMutableDictionary alloc] init];
            int valueIndex = 0;
            for (NSNumber* key in request.m_Keys) {
                int index = [key intValue];
                NSString* keyString = @"";
                switch (index) {
                    case 0:
                        keyString = SKReceiptPropertyIsExpired;
                        break;
                    case 1:
                        keyString = SKReceiptPropertyIsRevoked;
                        break;
                    case 2:
                        keyString = SKReceiptPropertyIsVolumePurchase;
                        break;

                    default:
                        break;
                }

                [dic setValue:request.m_Values[valueIndex] forKey:keyString];
                valueIndex++;
            }
            refreshRequest = [[SKReceiptRefreshRequest alloc] initWithReceiptProperties:dic];
        }

        requestDelegate = [[ISN_SKRequestDelegate alloc] init];
        [requestDelegate setCallback:callback];
        [refreshRequest setDelegate:requestDelegate];
        [refreshRequest start];
    }
}

