#import "ISN_SKTransactionObserver.h"

@implementation ISN_SKTransactionObserver



-(id) init {
    if(self = [super init]){
        [self setTransactions:[[NSMutableDictionary alloc] init]];
    }
    return self;
}


-(void) reportTransaction:(ISN_SKPaymentTransaction *)transaction {
    ISN_SendMessage(UNITY_SK_LISTENER, "OnTransactionUpdated", [transaction toJSONString]);
}

//// Sent when the transaction array has changed (additions or state changes).  Client should check state of transactions and finish as appropriate.
- (void)paymentQueue:(nonnull SKPaymentQueue *)queue updatedTransactions:(nonnull NSArray<SKPaymentTransaction *> *)transactions {
    for (SKPaymentTransaction *transaction in transactions) {
        if(transaction.transactionIdentifier != NULL) {
            [self.transactions setObject:transaction forKey:transaction.transactionIdentifier];
        }
        
        ISN_SKPaymentTransaction *transactionResult =  [[ISN_SKPaymentTransaction alloc] initWithSKPaymentTransaction:transaction];
        [self reportTransaction:transactionResult];
    }
}



// Sent when transactions are removed from the queue (via finishTransaction:).
- (void)paymentQueue:(SKPaymentQueue *)queue removedTransactions:(NSArray<SKPaymentTransaction *> *)transactions  {
    for (SKPaymentTransaction *transaction in transactions) {
        
        ISN_SKPaymentTransaction *transactionResult =  [[ISN_SKPaymentTransaction alloc] initWithSKPaymentTransaction:transaction];
        ISN_SendMessage(UNITY_SK_LISTENER, "OnTransactionRemoved", [transactionResult toJSONString]);
    }
}

//// Sent when a user initiates an IAP buy from the App Store
- (BOOL)paymentQueue:(SKPaymentQueue *)queue shouldAddStorePayment:(SKPayment *)payment forProduct:(SKProduct *)product {
    ISN_SKProduct* productResult = [[ISN_SKProduct alloc] initWithSKProduct:product];
    ISN_SendMessage(UNITY_SK_LISTENER, "OnShouldAddStorePayment", [productResult toJSONString]);
    return false;
}

- (void)paymentQueueDidChangeStorefront:(SKPaymentQueue *)queue {
     ISN_SendMessage(UNITY_SK_LISTENER, "OnDidChangeStorefront", @"");
}

// Sent when an error is encountered while adding transactions from the user's purchase history back to the queue.
- (void)paymentQueue:(SKPaymentQueue *)queue restoreCompletedTransactionsFailedWithError:(NSError *)error  {
    SA_Result* result = [[SA_Result alloc] initWithNSError:error];
    ISN_SendMessage(UNITY_SK_LISTENER, "OnRestoreTransactionsComplete", [result toJSONString]);
}

// Sent when all transactions from the user's purchase history have successfully been added back to the queue.
- (void)paymentQueueRestoreCompletedTransactionsFinished:(SKPaymentQueue *)queue {
    SA_Result* result = [[SA_Result alloc] init];
    ISN_SendMessage(UNITY_SK_LISTENER, "OnRestoreTransactionsComplete", [result toJSONString]);
}

@end
