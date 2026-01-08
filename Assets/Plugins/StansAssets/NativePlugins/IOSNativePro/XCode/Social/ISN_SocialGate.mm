#if !TARGET_OS_TV

////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

#import <Foundation/Foundation.h>
#import <Accounts/Accounts.h>
#import <Social/Social.h>
#import <MessageUI/MessageUI.h>

#import "ISN_Foundation.h"

const char* FACEBOOK_LISTENER = "SA.iOS.Social.ISN_Facebook+NativeListener";
const char* TWITTER_LISTENER = "SA.iOS.Social.ISN_Twitter+NativeListener";
const char* INSTAGRAM_LISTENER = "SA.iOS.Social.ISN_Instagram+NativeListener";
const char* MAIL_LISTENER = "SA.iOS.Social.ISN_Mail+NativeListener";
const char* TEXT_MESSAGE_LISTENER = "SA.iOS.Social.ISN_TextMessage+NativeListener";


@interface ISN_SocialGate : NSObject<MFMailComposeViewControllerDelegate, MFMessageComposeViewControllerDelegate>


@property (nonatomic, strong) UIDocumentInteractionController * documentInteractionController;

+ (id) sharedInstance;


- (void) twitterPost:(NSString*)status url: (NSString*) url imagesList:(NSArray<NSString *> *)imagesList;
- (void) fbPost:(NSString*)status  url: (NSString*) url imagesList:(NSArray<NSString *> *)imagesList;



- (void) sendEmail:(NSString *)subject body:(NSString *)body recipients:(NSArray<NSString *> *)recipients imagesList:(NSArray<NSString *> *)imagesList;
- (void) sendTextMessagel:(NSString *)body recipients:(NSArray<NSString *> *)recipients imagesList:(NSArray<NSString *> *)imagesList;


- (void)whatsappShareText:(NSString *)msg;
- (void)whatsappShareImage:(NSString *)media;


@end


@implementation ISN_SocialGate

static ISN_SocialGate * cg_sharedInstance;


+ (id)sharedInstance {
    
    if (cg_sharedInstance == nil)  {
        cg_sharedInstance = [[self alloc] init];
    }
    
    return cg_sharedInstance;
}

#define MMM_WHATSAPP_URL @"whatsapp://"
#define MMM_WHATSAPP_IMAGEFILENAME @"wa.wai"
#define MMM_WHATSAPP_IMAGEUTI @"net.whatsapp.image"

-(BOOL)whatsappInstalled{
    return [[UIApplication sharedApplication] canOpenURL:[NSURL URLWithString:MMM_WHATSAPP_URL]];
}

-(void)whatsappShareText:(NSString *)msg {

    NSString * urlWhats = [NSString stringWithFormat:@"whatsapp://send?text=%@",msg];
    NSURL * whatsappURL = [NSURL URLWithString:[urlWhats stringByAddingPercentEscapesUsingEncoding:NSUTF8StringEncoding]];
    if ([[UIApplication sharedApplication] canOpenURL: whatsappURL]) {
        [[UIApplication sharedApplication] openURL: whatsappURL];
    } else {
        //Probably report the errror
    }
}

-(void)whatsappShareImage:(NSString *)media {
    
    NSData *imageData = [[NSData alloc] initWithBase64EncodedString:media options:NSDataBase64DecodingIgnoreUnknownCharacters];
    UIImage *image = [[UIImage alloc] initWithData:imageData];
    
    NSString *filepath=[NSTemporaryDirectory() stringByAppendingPathComponent:MMM_WHATSAPP_IMAGEFILENAME];
    NSURL *fileURL = [NSURL fileURLWithPath:filepath];
    
    // save image to path..
    if([UIImagePNGRepresentation(image) writeToFile:filepath atomically:YES]){
        
        // setup a document interaction controller with our file ..
        UIDocumentInteractionController *dic = [self setupControllerWithURL:fileURL  usingDelegate:nil];
        self.documentInteractionController=dic;
        dic.UTI = MMM_WHATSAPP_IMAGEUTI;
        dic.name = MMM_WHATSAPP_IMAGEFILENAME;
        
        dic.annotation=@{@"message":@"Test Text",@"text":@"Test Text"};
        
        
        UIViewController *vc =  UnityGetGLViewController();
        
        [dic presentOpenInMenuFromRect:vc.view.bounds inView:vc.view animated:YES];
        
        // exit; we're not calling activityDidFinish here, but later in documentInteractionControllerDidDismissOpenInMenu.
        return;
    }
}

- (UIDocumentInteractionController *) setupControllerWithURL: (NSURL*) fileURL
                                               usingDelegate: (id <UIDocumentInteractionControllerDelegate>) interactionDelegate {
    
    UIDocumentInteractionController *interactionController =
    [UIDocumentInteractionController interactionControllerWithURL: fileURL];
    interactionController.delegate = interactionDelegate;
    
    return interactionController;
}


-(void) twitterPost:(NSString *)status url:(NSString *)url imagesList:(NSArray<NSString *> *)imagesList; {

    [SLComposeServiceViewController attemptRotationToDeviceOrientation];
    __weak SLComposeViewController *tweetSheet = [SLComposeViewController composeViewControllerForServiceType:SLServiceTypeTwitter];
    
    if(tweetSheet == NULL) {
        ISN_SendMessage(TWITTER_LISTENER, "OnTwitterPostFailed", @"");
        return;
    }
    
    
    if(status.length > 0) {
        [tweetSheet setInitialText:status];
    }
    
    if(url.length > 0) {
        NSURL *urlObject = [NSURL URLWithString:url];
        [tweetSheet addURL:urlObject];
    }
    
    if(imagesList.count > 0) {
        for(NSString* media in imagesList) {
            NSData *imageData = [[NSData alloc] initWithBase64EncodedString:media options:NSDataBase64DecodingIgnoreUnknownCharacters];
            UIImage *image = [[UIImage alloc] initWithData:imageData];
            [tweetSheet addImage:image];
        }
    }
    
   
    
    UIViewController *vc =  UnityGetGLViewController();
    [vc presentViewController:tweetSheet animated:YES completion:nil];
    
    tweetSheet.completionHandler = ^(SLComposeViewControllerResult result) {
        switch(result) {
            //  This means the user cancelled without sending the Tweet
            case SLComposeViewControllerResultCancelled:
                ISN_SendMessage(TWITTER_LISTENER, "OnTwitterPostFailed", @"");
                break;
            //  This means the user hit 'Send'
            case SLComposeViewControllerResultDone:
                ISN_SendMessage(TWITTER_LISTENER, "OnTwitterPostSuccess", @"");
                break;
        }
    };
}

- (void) fbPost:(NSString *)status url:(NSString *)url imagesList:(NSArray<NSString *> *)imagesList {
    [SLComposeServiceViewController attemptRotationToDeviceOrientation];
    __weak SLComposeViewController *fbSheet = [SLComposeViewController composeViewControllerForServiceType:SLServiceTypeFacebook];
    if(fbSheet == NULL) {
        ISN_SendMessage(FACEBOOK_LISTENER, "OnFacebookPostFailed", @"");
        return;
    }
    
    
    if(status.length > 0) {
        [fbSheet setInitialText:status];
    }
    
    if(url.length > 0) {
        NSURL *urlObject = [NSURL URLWithString:url];
        [fbSheet addURL:urlObject];
    }
    
    if(imagesList.count > 0) {
        for(NSString* media in imagesList) {
            NSData *imageData = [[NSData alloc] initWithBase64EncodedString:media options:NSDataBase64DecodingIgnoreUnknownCharacters];
            UIImage *image = [[UIImage alloc] initWithData:imageData];
            [fbSheet addImage:image];
        }
    }
    
    UIViewController *vc =  UnityGetGLViewController();
    [vc presentViewController:fbSheet animated:YES completion:nil];
    
    fbSheet.completionHandler = ^(SLComposeViewControllerResult result) {
        switch(result) {
            case SLComposeViewControllerResultCancelled:
                ISN_SendMessage(FACEBOOK_LISTENER, "OnFacebookPostFailed", @"");
                break;
                //  This means the user hit 'Send'
            case SLComposeViewControllerResultDone:
                ISN_SendMessage(FACEBOOK_LISTENER, "OnFacebookPostSuccess", @"");
                break;
        }
        
    };
    
}



- (void) sendEmail:(NSString *)subject body:(NSString *)body recipients:(NSArray<NSString *> *)recipients imagesList:(NSArray<NSString *> *)imagesList {
    //Create a string with HTML formatting for the email body
    NSMutableString *emailBody = [[NSMutableString alloc] initWithString:@"<html><body>"] ;
    
    //Add some text to it however you want
    [emailBody appendString:@"<p>"];
    [emailBody appendString:body];
    [emailBody appendString:@"</p>"];
    
 
    //close the HTML formatting
    [emailBody appendString:@"</body></html>"];
    
    
    if (![MFMailComposeViewController canSendMail]) {
        ISN_SendMessage(MAIL_LISTENER, "OnMailFailed", @"");
        return;
    }

    //Create the mail composer window
    MFMailComposeViewController *emailDialog = [[MFMailComposeViewController alloc] init];
    
    if(emailDialog == nil) {
        ISN_SendMessage(MAIL_LISTENER, "OnMailFailed", @"");
        return;
    }
    
    emailDialog.mailComposeDelegate = self;
    [emailDialog setSubject:subject];
    [emailDialog setMessageBody:emailBody isHTML:YES];
    
    
    if(imagesList.count > 0) {
        for(NSString* media in imagesList) {
            NSData *imageData = [[NSData alloc] initWithBase64EncodedString:media options:NSDataBase64DecodingIgnoreUnknownCharacters];
            [emailDialog addAttachmentData:imageData mimeType:@"image/png" fileName:@"Attachment"];
        }
    }
    [emailDialog setToRecipients:recipients];
    
    UIViewController *vc =  UnityGetGLViewController();
    [vc presentViewController:emailDialog animated:YES completion:nil];
}


#pragma private

- (NSString*) photoFilePath {
    return [NSString stringWithFormat:@"%@/%@",[NSHomeDirectory() stringByAppendingPathComponent:@"Documents"],@"tempinstgramphoto.igo"];
}


- (void) mailComposeController:(MFMailComposeViewController *)controller didFinishWithResult:(MFMailComposeResult)result error:(NSError *)error {
    NSLog(@"I HAVE A MAIL RESULT");
    switch (result)
    {
        case MFMailComposeResultCancelled:
            ISN_SendMessage(MAIL_LISTENER, "OnMailFailed", @"");
            break;
        case MFMailComposeResultSaved:
            ISN_SendMessage(MAIL_LISTENER, "OnMailFailed", @"");
            break;
        case MFMailComposeResultSent:
            ISN_SendMessage(MAIL_LISTENER, "OnMailSuccess", @"");
            break;
        case MFMailComposeResultFailed:
            ISN_SendMessage(MAIL_LISTENER, "OnMailFailed", @"");
            break;
        default:
             ISN_SendMessage(MAIL_LISTENER, "OnMailFailed", @"");
            break;
    }
    
    UIViewController *vc =  UnityGetGLViewController();
    [vc dismissViewControllerAnimated:YES completion:NULL];
}


- (void) sendTextMessagel:(NSString *)body recipients:(NSArray<NSString *> *)recipients imagesList:(NSArray<NSString *> *)imagesList {
    
    MFMessageComposeViewController *controller = [[MFMessageComposeViewController alloc] init];
    
    if([MFMessageComposeViewController canSendText]) {
        controller.body = body;
        controller.recipients = recipients;
       
        
        
        if([MFMessageComposeViewController canSendAttachments] && imagesList.count > 0) {
            for(NSString* media in imagesList) {
                NSData *imageData = [[NSData alloc] initWithBase64EncodedString:media options:NSDataBase64DecodingIgnoreUnknownCharacters];
                [controller addAttachmentData:imageData typeIdentifier:@"public.data" filename:@"Image.png"];
            }
        }

        controller.messageComposeDelegate = self;
        UIViewController *vc =  UnityGetGLViewController();
        [vc presentViewController:controller animated:YES completion:nil];
    } else {
        //not supported by device error code
        ISN_SendMessage(TEXT_MESSAGE_LISTENER, "OnTextMessageComposeResult", @"3");
    }
    
}

- (void)messageComposeViewController:(MFMessageComposeViewController *)controller didFinishWithResult:(MessageComposeResult)result {
    
    [controller dismissViewControllerAnimated:YES completion:nil];
    ISN_SendMessage(TEXT_MESSAGE_LISTENER, "OnTextMessageComposeResult", [NSString stringWithFormat:@"%d", (int) result]);
}



@end


@interface IOSInstaPlugin : NSObject<UIDocumentInteractionControllerDelegate>

+ (id) sharedInstance;

- (void) share:(NSString*)status media: (NSString*) media;


@end


@interface MGInstagram : NSObject <UIDocumentInteractionControllerDelegate>

extern NSString* const kInstagramAppURLString;
extern NSString* const kInstagramOnlyPhotoFileName;

//DEFAULT file name is kInstagramDefualtPhotoFileName
//DEFAULT file name is restricted to only the instagram app
//Make sure your photoFileName has a valid photo extension.
+ (void) setPhotoFileName:(NSString*)fileName;
+ (NSString*) photoFileName;

//checks to see if user has instagram installed on device
+ (BOOL) isAppInstalled;

//checks to see if image is large enough to be posted by instagram
//returns NO if image dimensions are under 612x612
//
//Technically the instagram allows for photos to be published under the size of 612x612
//BUT if you want nice quality pictures, I recommend checking the image size.
+ (BOOL) isImageCorrectSize:(UIImage*)image;

//post image to instagram by passing in the target image and
//the view in which the user will be presented with the instagram model
+ (void) postImage:(UIImage*)image inView:(UIView*)view;
//Same as above method but with the option for a photo caption
+ (void) postImage:(UIImage*)image withCaption:(NSString*)caption inView:(UIView*)view;
+ (void) postImage:(UIImage*)image withCaption:(NSString*)caption inView:(UIView*)view delegate:(id<UIDocumentInteractionControllerDelegate>)delegate;

@end



@implementation IOSInstaPlugin

static IOSInstaPlugin *_sharedInstance;


+ (id)sharedInstance {
    
    if (_sharedInstance == nil)  {
        _sharedInstance = [[self alloc] init];
    }
    
    return _sharedInstance;
}
-(void) share:(NSString *)status media:(NSString *)media {
    NSData *imageData = [[NSData alloc] initWithBase64EncodedString:media options:NSDataBase64DecodingIgnoreUnknownCharacters];
    UIImage *image = [[UIImage alloc] initWithData:imageData];
    
    
    
    if ([[[UIDevice currentDevice] systemVersion] floatValue] < 5.0) {
        ISN_SendMessage(INSTAGRAM_LISTENER, "OnInstaPostFailed", @"3");
    } else {
        
        if ([MGInstagram isAppInstalled]) {
            UIViewController *vc =  UnityGetGLViewController();
            [MGInstagram postImage:image withCaption:status inView:vc.view delegate:self];
        } else {
            ISN_SendMessage(INSTAGRAM_LISTENER, "OnInstaPostFailed", @"1");
        }
        
    }
    
}


- (void)documentInteractionControllerDidDismissOpenInMenu:(UIDocumentInteractionController *)controller {
    ISN_SendMessage(INSTAGRAM_LISTENER, "OnInstaPostFailed", @"2");
}


- (void) documentInteractionController: (UIDocumentInteractionController *) controller willBeginSendingToApplication: (NSString *) application {
     ISN_SendMessage(INSTAGRAM_LISTENER, "OnInstaPostSuccess", @"");
     controller.delegate = nil;
}



@end



@interface MGInstagram () {
    UIDocumentInteractionController *documentInteractionController;
}

@property (nonatomic) NSString *photoFileName;

@end

@implementation MGInstagram

NSString* const kInstagramAppURLString = @"instagram://app";
NSString* const kInstagramOnlyPhotoFileName = @"tempinstgramphoto.igo";

+ (instancetype) sharedInstance
{
    static MGInstagram* sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[MGInstagram alloc] init];
    });
    return sharedInstance;
}

- (id) init {
    if (self = [super init]) {
        self.photoFileName = kInstagramOnlyPhotoFileName;
    }
    return self;
}

+ (void) setPhotoFileName:(NSString*)fileName {
    [MGInstagram sharedInstance].photoFileName = fileName;
}
+ (NSString*) photoFileName {
    return [MGInstagram sharedInstance].photoFileName;
}

+ (BOOL) isAppInstalled {
    NSURL *appURL = [NSURL URLWithString:kInstagramAppURLString];
    return [[UIApplication sharedApplication] canOpenURL:appURL];
}

//Technically the instagram allows for photos to be published under the size of 612x612
//BUT if you want nice quality pictures, I recommend checking the image size.
+ (BOOL) isImageCorrectSize:(UIImage*)image {
    CGImageRef cgImage = [image CGImage];
    return (CGImageGetWidth(cgImage) >= 612 && CGImageGetHeight(cgImage) >= 612);
}

- (NSString*) photoFilePath {
    return [NSString stringWithFormat:@"%@/%@",[NSHomeDirectory() stringByAppendingPathComponent:@"Documents"],self.photoFileName];
}

+ (void) postImage:(UIImage*)image inView:(UIView*)view {
    [self postImage:image withCaption:nil inView:view];
}
+ (void) postImage:(UIImage*)image withCaption:(NSString*)caption inView:(UIView*)view {
    [self postImage:image withCaption:caption inView:view delegate:nil];
}

+ (void) postImage:(UIImage*)image withCaption:(NSString*)caption inView:(UIView*)view delegate:(id<UIDocumentInteractionControllerDelegate>)delegate {
    [[MGInstagram sharedInstance] postImage:image withCaption:caption inView:view delegate:delegate];
}

- (void) postImage:(UIImage*)image withCaption:(NSString*)caption inView:(UIView*)view delegate:(id<UIDocumentInteractionControllerDelegate>)delegate
{
    if (!image)
        [NSException raise:NSInternalInconsistencyException format:@"Image cannot be nil!"];
    
    [UIImageJPEGRepresentation(image, 1.0) writeToFile:[self photoFilePath] atomically:YES];
    
    
    
    NSURL *fileURL = [NSURL fileURLWithPath:[self photoFilePath]];
    documentInteractionController = [UIDocumentInteractionController interactionControllerWithURL:fileURL];
    
    documentInteractionController.UTI = @"com.instagram.exclusivegram";
    documentInteractionController.delegate = delegate;
    if (caption)
        documentInteractionController.annotation = [NSDictionary dictionaryWithObject:caption forKey:@"InstagramCaption"];
    
    [documentInteractionController presentOpenInMenuFromRect:CGRectZero inView:view animated:YES];
    
}


@end



extern "C" {
    
    NSArray* charToNSArray(char *value) {
        NSString* strValue = [NSString stringWithUTF8String: value];
        
        NSArray *array;
        if([strValue length] == 0) {
            array = [[NSArray alloc] init];
        } else {
            array = [strValue componentsSeparatedByString:@"%%%"];
        }
        
        return array;
    }
    
    
    //--------------------------------------
    //  IOS Plugin Section - Facebook
    //--------------------------------------
    
    void _ISN_FbPost(char* text, char* url, char* encodedMedia) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_FbPost" data:ISN_ConvertToChar([NSString stringWithFormat:@"text: %s url: %s encodedMedia: %s: ", text, url, encodedMedia])];

        NSArray* imagesList = charToNSArray(encodedMedia);
        [[ISN_SocialGate sharedInstance] fbPost:[NSString stringWithUTF8String: text] url:[NSString stringWithUTF8String: url] imagesList:imagesList];
    }
    
    
    //--------------------------------------
    //  IOS Plugin Section - Twitter
    //--------------------------------------
    
    
    void _ISN_TwPost(char* text, char* url, char* encodedMedia) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_TwPost" data:ISN_ConvertToChar([NSString stringWithFormat:@"text: %s url: %s encodedMedia: %s", text, url, encodedMedia])];

        NSArray* imagesList = charToNSArray(encodedMedia);
        [[ISN_SocialGate sharedInstance] twitterPost:[NSString stringWithUTF8String: text] url:[NSString stringWithUTF8String: url] imagesList:imagesList];
    }
    
    //--------------------------------------
    //  IOS Plugin Section - Instagram
    //--------------------------------------
    
    
    void _ISN_InstaShare(char* encodedMedia, char* text) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_InstaShare" data:ISN_ConvertToChar([NSString stringWithFormat:@"encodedMedia: %s text: %s", encodedMedia, text])];
        
        NSString *status = [NSString stringWithUTF8String: text];
        NSString *media = [NSString stringWithUTF8String: encodedMedia];
        
        [[IOSInstaPlugin sharedInstance] share:status media:media];
    }
  
    
    void _ISN_WP_ShareText(char* text) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_WP_ShareText" data:text];

        NSString *msg =  [NSString stringWithUTF8String: text];
        [[ISN_SocialGate sharedInstance] whatsappShareText:msg];
    }
    
    
    void _ISN_WP_ShareMedia(char* encodedMedia) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_WP_ShareMedia" data:encodedMedia];
        
        NSString *media = [NSString stringWithUTF8String: encodedMedia];
        [[ISN_SocialGate sharedInstance] whatsappShareImage:media];
    }
    
    
    
    void _ISN_SendMail(char* subject, char* body,  char* recipients, char* encodedMedia) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_SendMail" data:ISN_ConvertToChar([NSString stringWithFormat:@"subject: %s body: %s recipients: %s encodedMedia: %s", subject, body, recipients, encodedMedia])];

        NSString *mailSubject       = [NSString stringWithUTF8String: subject];
        NSString *mailBody          = [NSString stringWithUTF8String: body];
        NSArray* mailRecipients = charToNSArray(recipients); ;
        NSArray* imagesList     = charToNSArray(encodedMedia);
        
        
        [[ISN_SocialGate sharedInstance] sendEmail:mailSubject body:mailBody recipients:mailRecipients imagesList:imagesList];
    }
    
   
    
    void _ISN_SendTextMessage(char* body, char* recipients, char* encodedMedia) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_SendTextMessage" data:ISN_ConvertToChar([NSString stringWithFormat:@"body: %s recipients: %s encodedMedia: %s", body, recipients, encodedMedia])];
        
        NSString *msgBody          = [NSString stringWithUTF8String: body];
        NSArray* msgRecipients     = charToNSArray(recipients); ;
        NSArray* imagesList        = charToNSArray(encodedMedia);
        
        [[ISN_SocialGate sharedInstance] sendTextMessagel:msgBody recipients:msgRecipients imagesList:imagesList];
    }
}

#endif
