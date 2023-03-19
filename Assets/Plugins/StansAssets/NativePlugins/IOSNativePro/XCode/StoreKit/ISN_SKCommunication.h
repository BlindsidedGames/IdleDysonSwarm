#import "JSONModel.h"
#import "ISN_Foundation.h"
#import "ISN_NSCommunication.h"
#import <StoreKit/StoreKit.h>

@interface SKProduct (LocalizedPrice)
@property (nonatomic, readonly) NSString *localizedPrice;
@end

@interface SKProductDiscount (LocalizedPrice)
@property (nonatomic, readonly) NSString *localizedPrice;
@end

@interface ISN_SKProductSubscriptionPeriod : JSONModel
//Getting Subscription Period Details
@property (nonatomic) NSUInteger m_NumberOfUnits;
@property (nonatomic) SKProductPeriodUnit m_Unit;
@end


@protocol ISN_SKProductDiscount;
@interface ISN_SKProductDiscount : JSONModel

//Getting Price and Payment Mode
@property (nonatomic) NSString *m_Identifier;
@property (nonatomic) int m_NumberOfPeriods;
@property (nonatomic) SKProductDiscountType m_Type;


@property (nonatomic) NSDecimalNumber *m_Price;
@property (nonatomic) ISN_NSLocale *m_PriceLocale;
@property (nonatomic) SKProductDiscountPaymentMode m_PaymentMode;
//Getting the Discount Duration
@property (nonatomic) NSUInteger m_NumberOfUnits;
@property (nonatomic) ISN_SKProductSubscriptionPeriod *m_SubscriptionPeriod;

//Additional fields
@property (nonatomic) NSString *m_LocalizedPrice;

@end



@protocol ISN_SKProduct;
@interface ISN_SKProduct : JSONModel

-(id) initWithSKProduct:(SKProduct *) product;

@property unsigned long m_NativeHashCode;
@property (nonatomic) NSString *m_ProductIdentifier;
//Getting Product Attributes
@property (nonatomic) NSString *m_LocalizedDescription;
@property (nonatomic) NSString *m_LocalizedTitle;
//Getting Pricing Information
@property (nonatomic) NSDecimalNumber *m_Price;
@property (nonatomic) ISN_NSLocale *m_PriceLocale;
@property (nonatomic) ISN_SKProductDiscount *m_IntroductoryPrice;
@property (nonatomic) NSArray <ISN_SKProductDiscount> *m_Discounts;
//Getting the Subscription Period and Duration
@property (nonatomic) ISN_SKProductSubscriptionPeriod *m_SubscriptionPeriod;
//Additional fields
@property (nonatomic) NSString *m_LocalizedPrice;
@end

@interface ISN_SKPaymentTransaction : SA_Result
-(id) initWithSKPaymentTransaction:(SKPaymentTransaction *) transaction;

//from SKPayment
@property (nonatomic) NSString *m_ProductIdentifier;
@property (nonatomic) ISN_SKPaymentTransaction *m_originalTransaction;

@property (nonatomic) NSString *m_TransactionIdentifier;
@property (nonatomic) SKPaymentTransactionState m_State;
@property (nonatomic) long m_UnixDate;
@end

@interface ISN_SKInitResult : SA_Result
@property (nonatomic)  NSArray <ISN_SKProduct> *m_Products;
@property (nonatomic)  NSArray <NSString *> *m_InvalidProductIdentifiers;

-(id) initWithSKProductsRespons:(SKProductsResponse*) response;
@end

@interface ISN_LoadStoreRequest : JSONModel
@property (nonatomic) NSArray <NSString *> *ProductIdentifiers;
@end

@protocol ISN_SKStorefront;
@interface ISN_SKStorefront : JSONModel
@property (nonatomic) NSString *m_CountryCode;
@property (nonatomic) NSString *m_Identifier;
-(id) initWithSKStorefront:(SKStorefront*) storefront API_AVAILABLE(ios(13.0));
@end


@protocol ISN_SKStorefrontChageEvent;
@interface ISN_SKStorefrontChageEvent : JSONModel
@property (nonatomic) ISN_SKStorefront *m_Storefront;
@property (nonatomic) ISN_SKPaymentTransaction *m_Transaction;
-(id) initWithSKModels:(SKStorefront*) storefront transaction: (SKPaymentTransaction*) transaction API_AVAILABLE(ios(13.0));
@end


