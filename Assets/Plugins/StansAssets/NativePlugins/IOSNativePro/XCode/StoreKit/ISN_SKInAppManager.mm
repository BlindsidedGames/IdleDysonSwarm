#import "ISN_SKCommunication.h"
#import "ISN_Logger.h"
#import "ISN_SKTransactionObserver.h"
#import "ISN_SKProductsRequestDelegate.h"
#import <StoreKit/StoreKit.h>



@interface SA_PluginSettingsWindowStylesAppManager : NSObject
    @property (nonatomic, strong) ISN_SKTransactionObserver* transactionObserver;
    @property (nonatomic, strong) ISN_SKProductsRequestDelegate* productsRequestDelegate;
@end



@implementation SA_PluginSettingsWindowStylesAppManager


static SA_PluginSettingsWindowStylesAppManager * s_sharedInstance;
+ (id)sharedInstance {
    
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    return s_sharedInstance;
}


-(id) init {
    [ISN_Logger Log: @"ISN_InAppManager::init"];
    if(self = [super init]){
        [self setTransactionObserver:[[ISN_SKTransactionObserver alloc] init]];
        [self setProductsRequestDelegate:[[ISN_SKProductsRequestDelegate alloc] init]];
    }
    return self;
}


-(void) SetTransactionObserverState:(bool) enbaled {
    if(enbaled) {
        [[SKPaymentQueue defaultQueue] addTransactionObserver:[self transactionObserver]];
    } else {
        [[SKPaymentQueue defaultQueue] removeTransactionObserver:[self transactionObserver]];
    }
}


- (void)loadStoreProductsWithIdentifiers:(NSArray *)ProductsIdentifiers {
    [ISN_Logger Log: @"loadStoreProductsWithIdentifiers...."];
    SKProductsRequest *request= [[SKProductsRequest alloc] initWithProductIdentifiers:[NSSet setWithArray:ProductsIdentifiers]];
    request.delegate = self.productsRequestDelegate;
    [request start];
    
}

-(void) addPayment:(NSString*) productsIdentifier {
    
    SKProduct* selectedProduct =  [[self.productsRequestDelegate products] objectForKey:productsIdentifier];
    if(selectedProduct != NULL) {
        SKPayment *payment = [SKPayment paymentWithProduct:selectedProduct];
        [[SKPaymentQueue defaultQueue] addPayment:payment];
    } else {
        SA_Error* error = [[SA_Error alloc] initWithCode:1 message:@"product not found"];
        ISN_SKPaymentTransaction * transaction = [[ISN_SKPaymentTransaction alloc] initWithError:error];
        [self.transactionObserver reportTransaction:transaction];
    }
}

-(void) restoreCompletedTransactions {
    [[SKPaymentQueue defaultQueue] restoreCompletedTransactions];
}

- (void) finishTransaction:(NSString*) transactionIdentifier {
    //item will be there 100% relaying on a C# part here
    SKPaymentTransaction* transaction =  [[self.transactionObserver transactions] objectForKey:transactionIdentifier];
    if(transaction != NULL) {
        [[SKPaymentQueue defaultQueue] finishTransaction:transaction];
    } else {
        [ISN_Logger LogWarning:@"Transactions with id: %@ wasn't found", transactionIdentifier];
    }
    
}

@end



extern "C" {
    
    
    //--------------------------------------
    //  MARKET
    //--------------------------------------
    
    void _ISN_LoadStore(char * data) {
        
        
        [ISN_Logger LogNativeMethodInvoke:"_ISN_LoadStore" data:data];
        
        NSError *jsonError;
        ISN_LoadStoreRequest *request = [[ISN_LoadStoreRequest alloc] initWithChar:data error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_LoadStore JSON parsing error: %@", jsonError.description];
        }
        
        [[SA_PluginSettingsWindowStylesAppManager sharedInstance] loadStoreProductsWithIdentifiers:request.ProductIdentifiers];
    }

    const char * _ISN_SKPaymentQueue_Storefront() {

        ISN_SKStorefront * isn_storefront;
        if (@available(iOS 13.0, *)) {
            SKStorefront* storefront = [[SKPaymentQueue defaultQueue] storefront];
            if(storefront != nil) {
                 isn_storefront = [[ISN_SKStorefront alloc] initWithSKStorefront:storefront];
                 return ISN_ConvertToChar([isn_storefront toJSONString]);
            }
        }
        
        isn_storefront = [[ISN_SKStorefront alloc] init];
        return ISN_ConvertToChar([isn_storefront toJSONString]);
    }
    
    void _ISN_SetTransactionObserverState(bool enabled) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_SetTransactionObserverState" data: enabled ? "enabled"  : "disabled"];
        [[SA_PluginSettingsWindowStylesAppManager sharedInstance] SetTransactionObserverState:enabled];
    }
    
    void _ISN_AddPayment(char * productId) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_AddPayment" data:productId];
        [[SA_PluginSettingsWindowStylesAppManager sharedInstance] addPayment:[NSString stringWithUTF8String: productId]];
    }
   
    
    void _ISN_FinishTransaction(char* transactionIdentifier) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_FinishTransaction" data:transactionIdentifier];
        [[SA_PluginSettingsWindowStylesAppManager sharedInstance] finishTransaction:[NSString stringWithUTF8String: transactionIdentifier]];
    }
 
    void _ISN_RestoreCompletedTransactions() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_RestoreCompletedTransactions" data:""];
        [[SA_PluginSettingsWindowStylesAppManager sharedInstance] restoreCompletedTransactions];
    }
    
    
    bool _ISN_CanMakePayments() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CanMakePayments" data:""];
        return [SKPaymentQueue canMakePayments];
    }
    
    
    //--------------------------------------
    //  Transaction's Validation
    //--------------------------------------
    
    const char * _ISN_RetrieveAppStoreReceipt ()  {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_RetrieveAppStoreReceipt" data:""];
        NSString *base64Receipt = @"";
        
        NSURL *receiptURL = [[NSBundle mainBundle] appStoreReceiptURL];
        NSError *receiptError;
        BOOL isPresent = [receiptURL checkResourceIsReachableAndReturnError:&receiptError];
        
  
        if (isPresent) {
            NSData *receiptData = [NSData dataWithContentsOfURL:receiptURL];
            base64Receipt = ISN_ConvertToBase64(receiptData);
        }
        
        NSLog(@"base64Receipt: %@", base64Receipt);
        
        return ISN_ConvertToChar(base64Receipt);
    }
    
    
    
}

