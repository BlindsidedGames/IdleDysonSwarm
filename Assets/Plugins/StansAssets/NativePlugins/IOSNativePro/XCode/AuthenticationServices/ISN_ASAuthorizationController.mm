////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

#import <Foundation/Foundation.h>
#import <AuthenticationServices/AuthenticationServices.h>
#import "ISN_Foundation.h"
#import "ISN_NSCommunication.h"
#import "UnityAppController.h"

@protocol ISN_ASAuthorizationAppleIDCredential;
@interface ISN_ASAuthorizationAppleIDCredential : JSONModel
@property (nonatomic) NSString * m_User;
@property (nonatomic) NSString * m_State;
@property (nonatomic) NSString * m_AuthorizationCode;
@property (nonatomic) NSString * m_IdentityToken;
@property (nonatomic) NSString * m_Email;
@property (nonatomic) ISN_NSPersonNameComponents* m_FullName;


-(id) initWithAppleIDCredential:(ASAuthorizationAppleIDCredential*) credential API_AVAILABLE(ios(13.0));
@end

@implementation ISN_ASAuthorizationAppleIDCredential
-(id) initWithAppleIDCredential:(ASAuthorizationAppleIDCredential*) credential {
    self = [super init];
       if(self) {
           self.m_User = credential.user;
           if(credential.state != nil) { self.m_State = credential.state; }
           if(credential.email != nil) { self.m_Email = credential.email; }
           if(credential.authorizationCode != nil) { self.m_AuthorizationCode = [credential.authorizationCode AsBase64String]; }
           if(credential.identityToken != nil) { self.m_IdentityToken = [credential.identityToken AsBase64String]; }
           if(credential.fullName != nil) { self.m_FullName = [[ISN_NSPersonNameComponents alloc] initWithData:credential.fullName]; }
       }
       return self;
}
@end

@interface ISN_ASAuthorizationControllerDelegate : NSObject<ASAuthorizationControllerDelegate>
@property (nonatomic) UnityAction didCompleteWithError;
@property (nonatomic) UnityAction didCompleteWithAuthorization;
@end

@implementation ISN_ASAuthorizationControllerDelegate

- (void)authorizationController:(ASAuthorizationController *)controller didCompleteWithError:(NSError *)error  API_AVAILABLE(ios(13.0)){
    NSLog(@"ISN_ASAuthorizationControllerDelegate->didCompleteWithError");
    SA_Error* sa_error = [[SA_Error alloc] initWithNSError:error];
    ISN_SendCallbackToUnity(self.didCompleteWithError, [sa_error toJSONString]);
}

-(void) authorizationController:(ASAuthorizationController *)controller didCompleteWithAuthorization:(ASAuthorization *)authorization  API_AVAILABLE(ios(13.0)){
    
    NSLog(@"ISN_ASAuthorizationControllerDelegate->didCompleteWithAuthorization");
    if ([authorization.credential isKindOfClass:[ASAuthorizationAppleIDCredential class]]) {
        ASAuthorizationAppleIDCredential *appleIDCredential = (ASAuthorizationAppleIDCredential*) authorization.credential;
        ISN_ASAuthorizationAppleIDCredential* credential = [[ISN_ASAuthorizationAppleIDCredential alloc] initWithAppleIDCredential:appleIDCredential];
        ISN_SendCallbackToUnity(self.didCompleteWithAuthorization, [credential toJSONString]);
    }
}
@end

@interface DefaultrPresentationContextProviding : NSObject<ASAuthorizationControllerPresentationContextProviding>
@end

@implementation DefaultrPresentationContextProviding
- (nonnull ASPresentationAnchor)presentationAnchorForAuthorizationController:(nonnull ASAuthorizationController *)controller  API_AVAILABLE(ios(13.0)){
     UIViewController *vc =  UnityGetGLViewController();
    return vc.view.window;
}
@end

static DefaultrPresentationContextProviding* s_DefaultPresentationContextProviding = [[DefaultrPresentationContextProviding alloc] init];

extern "C" {

    unsigned long _ISN_ASAuthorizationController_initWithAuthorizationRequests(char *authorizationRequests) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_ASAuthorizationController_initWithAuthorizationRequests" data:authorizationRequests];
        if (@available(iOS 13.0, *)) {
            NSString* requestsString  = [NSString stringWithUTF8String: authorizationRequests];
            NSArray * requestsArray = [requestsString componentsSeparatedByString:@","];
            
            NSMutableArray<ASAuthorizationRequest *> *nativeRequests = [[NSMutableArray alloc] init];
            for (NSString* request in requestsArray) {
                NSNumberFormatter* numberFormatter = [[NSNumberFormatter alloc] init];
                NSNumber* requestId = [numberFormatter numberFromString:request];
                ASAuthorizationRequest* nativeRequest = (ASAuthorizationRequest*) [ISN_HashStorage Get:[requestId unsignedLongValue]];
                [nativeRequests addObject:nativeRequest];
            }
            
            return [ISN_HashStorage Add: [[ASAuthorizationController alloc] initWithAuthorizationRequests:nativeRequests]];
        } else {
            return [ISN_HashStorage NullObjectHash];
        }
    }

    void _ISN_ASAuthorizationController_setDelegate(unsigned long hash,  UnityAction didCompleteWithError, UnityAction didCompleteWithAuthorization) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_ASAuthorizationController_setDelegate" data:""];
        if (@available(iOS 13.0, *)) {
            ISN_ASAuthorizationControllerDelegate* delegate = [[ISN_ASAuthorizationControllerDelegate alloc] init];
            
            //Retain delegate
            [ISN_HashStorage Add:delegate];
            
            [delegate setDidCompleteWithError:didCompleteWithError];
            [delegate setDidCompleteWithAuthorization:didCompleteWithAuthorization];
            ASAuthorizationController* controller = (ASAuthorizationController*) [ISN_HashStorage Get:hash];
            [controller setDelegate:delegate];
        } else {
            // Fallback on earlier versions
        }
    }

    void _ISN_ASAuthorizationController_performRequests(unsigned long hash) {
        if (@available(iOS 13.0, *)) {
            ASAuthorizationController* controller = (ASAuthorizationController*) [ISN_HashStorage Get:hash];
            controller.presentationContextProvider = s_DefaultPresentationContextProviding;
            [controller performRequests];
        } else {
            // Fallback on earlier versions
        }
    }
}
