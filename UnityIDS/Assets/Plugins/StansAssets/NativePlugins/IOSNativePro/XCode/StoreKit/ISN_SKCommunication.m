#include "ISN_SKCommunication.h"


@implementation SKProduct (LocalizedPrice)

- (NSString *)localizedPrice {
    NSNumberFormatter *numberFormatter = [[NSNumberFormatter alloc] init];
    [numberFormatter setFormatterBehavior:NSNumberFormatterBehavior10_4];
    [numberFormatter setNumberStyle:NSNumberFormatterCurrencyStyle];
    [numberFormatter setLocale:self.priceLocale];
    NSString *formattedString = [numberFormatter stringFromNumber:self.price];
    return formattedString;
}
@end

@implementation SKProductDiscount (LocalizedPrice)

- (NSString *)localizedPrice {
    NSNumberFormatter *numberFormatter = [[NSNumberFormatter alloc] init];
    [numberFormatter setFormatterBehavior:NSNumberFormatterBehavior10_4];
    [numberFormatter setNumberStyle:NSNumberFormatterCurrencyStyle];
    [numberFormatter setLocale:self.priceLocale];
    NSString *formattedString = [numberFormatter stringFromNumber:self.price];
    return formattedString;
}

@end




@implementation ISN_SKProductSubscriptionPeriod
-(id) init { return self = [super init]; }
-(id) initWithSKProductSubscriptionPeriod:(SKProductSubscriptionPeriod *) productSubscriptionPeriod  API_AVAILABLE(ios(11.2)){
    self = [super init];
    if(self) {
        self.m_NumberOfUnits = productSubscriptionPeriod.numberOfUnits;
        self.m_Unit = productSubscriptionPeriod.unit;
    }
    return self;
}
@end


@implementation ISN_SKProductDiscount
-(id) init { return self = [super init]; }
-(id) initWithSKProductDiscount:(SKProductDiscount *) productDiscount  API_AVAILABLE(ios(11.2)){
    self = [super init];
    if(self) {

        if (@available(iOS 12.2, *)) {
            self.m_Identifier = productDiscount.identifier;
            self.m_Type = productDiscount.type;
            self.m_NumberOfPeriods = productDiscount.numberOfPeriods;
        }

        self.m_Price         = productDiscount.price   == NULL ? 0   : productDiscount.price;

        self.m_PriceLocale  = [[ISN_NSLocale alloc] initWithNSLocale:productDiscount.priceLocale];
        self.m_PaymentMode   = productDiscount.paymentMode;
        self.m_NumberOfUnits = productDiscount.numberOfPeriods;
        self.m_LocalizedPrice = productDiscount.localizedPrice;


        //introductoryPrice' is only available on iOS 11.2 or newer
        if(productDiscount.subscriptionPeriod != NULL) {
            self.m_SubscriptionPeriod = [[ISN_SKProductSubscriptionPeriod alloc] initWithSKProductSubscriptionPeriod:productDiscount.subscriptionPeriod];
        }
    }
    return self;
}
@end


@implementation ISN_SKProduct
-(id) init { return self = [super init]; }
-(id) initWithSKProduct:(SKProduct *) product {
    self = [super init];
    if(self) {
        self.m_NativeHashCode = [ISN_HashStorage Add:product];
        self.m_ProductIdentifier    = product.productIdentifier;
        self.m_LocalizedDescription = product.localizedDescription == NULL ? @"" : product.localizedDescription;
        self.m_LocalizedTitle       = product.localizedTitle       == NULL ? @"" : product.localizedTitle;
        self.m_Price                = product.price                == NULL ? 0   : product.price;

        self.m_PriceLocale = [[ISN_NSLocale alloc] initWithNSLocale:product.priceLocale];
        self.m_LocalizedPrice       = product.localizedPrice;

        if (@available(iOS 12.2, *)) {
            NSMutableArray<ISN_SKProductDiscount> * discountsArray = [[NSMutableArray<ISN_SKProductDiscount> alloc] init];
            for (SKProductDiscount *discount in  product.discounts) {
                ISN_SKProductDiscount *discountProduct = [[ISN_SKProductDiscount alloc] initWithSKProductDiscount:discount];
                [discountsArray addObject:discountProduct];
            }

            self.m_Discounts = discountsArray;
        }


        //introductoryPrice' is only available on iOS 11.2 or newer
        if (@available(iOS 11.2, *)) {
            if(product.introductoryPrice != NULL) {
                self.m_IntroductoryPrice = [[ISN_SKProductDiscount alloc] initWithSKProductDiscount:product.introductoryPrice];
            }
        } else {
            // Do nothing  on earlier versions
        }

        //subscriptionPeriod' is only available on iOS 11.2 or newer
        if (@available(iOS 11.2, *)) {
            if(product.subscriptionPeriod != NULL) {
                self.m_SubscriptionPeriod = [[ISN_SKProductSubscriptionPeriod alloc] initWithSKProductSubscriptionPeriod:product.subscriptionPeriod];
            }
        } else {
            // Do nothing  on earlier versions
        }


    }
    return self;
}
@end

@implementation ISN_SKPaymentTransaction

-(id) initWithSKPaymentTransaction:(SKPaymentTransaction *) transaction {
    self = [super init];
    if(self) {

        if(transaction.error != NULL) {
            self.m_error = [[SA_Error alloc] initWithNSError:transaction.error];
        }

        if(transaction.originalTransaction != NULL) {
            self.m_originalTransaction = [[ISN_SKPaymentTransaction alloc] initWithSKPaymentTransaction:transaction.originalTransaction];
        }

        self.m_State = transaction.transactionState;
        self.m_TransactionIdentifier = transaction.transactionIdentifier == NULL ? @"" : transaction.transactionIdentifier;
        self.m_ProductIdentifier = transaction.payment == NULL || transaction.payment.productIdentifier == NULL ? @"" : transaction.payment.productIdentifier;

        if(transaction.transactionDate != NULL) {
            NSDate * myDate = [[NSDate alloc] init];
            NSTimeZone *zone = [NSTimeZone systemTimeZone];
            NSInteger interval = [zone secondsFromGMTForDate:transaction.transactionDate];
            myDate = [myDate dateByAddingTimeInterval:interval];
            self.m_UnixDate = [myDate timeIntervalSince1970];
        } else {
            self.m_UnixDate = 0;
        }
    }
    return self;
}
@end

@implementation ISN_SKInitResult
-(id) init { return self = [super init]; }
-(id) initWithSKProductsRespons:(SKProductsResponse*) response {
    self = [super init];
    if(self) {
        NSMutableArray<ISN_SKProduct> * productsArray = [[NSMutableArray<ISN_SKProduct> alloc] init];
        for (SKProduct *product in response.products) {
            ISN_SKProduct *responseProduct = [[ISN_SKProduct alloc] initWithSKProduct:product];
            [productsArray addObject:responseProduct];
        }

        self.m_Products = productsArray;
        self.m_InvalidProductIdentifiers = response.invalidProductIdentifiers;
    }
    return  self;
}
@end


@implementation ISN_LoadStoreRequest
-(id) init {  return self = [super init]; }
@end

@implementation ISN_SKStorefront
 -(id) init { return self = [super init]; }
- (id) initWithSKStorefront:(SKStorefront *)storefront {
    self = [super init];
    if(self) {
       self.m_Identifier = storefront.identifier;
       self.m_CountryCode = storefront.countryCode;
    }
    return  self;
}
@end

@implementation ISN_SKStorefrontChageEvent
 -(id) init { return self = [super init]; }
- (id) initWithSKModels:(SKStorefront *)storefront transaction:(SKPaymentTransaction *)transaction {
    self = [super init];
    if(self) {
        self.m_Storefront = [[ISN_SKStorefront alloc] initWithSKStorefront:storefront];
        self.m_Transaction = [[ISN_SKPaymentTransaction alloc] initWithSKPaymentTransaction:transaction];;
    }
    return  self;
}
@end
