#import "JSONModel.h"
#import "ISN_SKCommunication.h"
#import <StoreKit/StoreKit.h>



@interface ISN_SKProductsRequestDelegate : NSObject <SKProductsRequestDelegate>
@property (nonatomic, strong) NSMutableDictionary* products;

@end
