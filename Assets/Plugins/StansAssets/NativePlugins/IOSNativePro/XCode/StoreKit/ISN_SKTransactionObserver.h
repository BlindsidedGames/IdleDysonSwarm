#import <StoreKit/StoreKit.h>
#import "ISN_SKCommunication.h"

@interface ISN_SKTransactionObserver : NSObject <SKPaymentTransactionObserver>
@property (nonatomic, strong) NSMutableDictionary* transactions;

-(void) reportTransaction:(ISN_SKPaymentTransaction*) transaction;
@end
