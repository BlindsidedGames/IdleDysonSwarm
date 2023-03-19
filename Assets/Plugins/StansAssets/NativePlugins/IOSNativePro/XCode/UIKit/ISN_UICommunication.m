#import "ISN_UICommunication.h"



@implementation ISN_UIAvailableMediaTypes
-(id) initWithArray:(NSArray <NSString *> *) array {
    self = [super init];
    if(self) {
        self.m_Types = array;
    }
    
    return self;
}
@end


#if !TARGET_OS_TV
@implementation ISN_UIPickerControllerRequest
-(id) init {return [super init]; }
@end
#endif

@implementation ISN_UIPickerControllerResult
-(id) init {return [super init]; }
@end



@implementation UIImage (fixOrientation)

- (UIImage *)fixOrientation {
    
    // No-op if the orientation is already correct
    if (self.imageOrientation == UIImageOrientationUp) return self;
    
    // We need to calculate the proper transformation to make the image upright.
    // We do it in 2 steps: Rotate if Left/Right/Down, and then flip if Mirrored.
    CGAffineTransform transform = CGAffineTransformIdentity;
    
    switch (self.imageOrientation) {
        case UIImageOrientationDown:
        case UIImageOrientationDownMirrored:
            transform = CGAffineTransformTranslate(transform, self.size.width, self.size.height);
            transform = CGAffineTransformRotate(transform, M_PI);
            break;
            
        case UIImageOrientationLeft:
        case UIImageOrientationLeftMirrored:
            transform = CGAffineTransformTranslate(transform, self.size.width, 0);
            transform = CGAffineTransformRotate(transform, M_PI_2);
            break;
            
        case UIImageOrientationRight:
        case UIImageOrientationRightMirrored:
            transform = CGAffineTransformTranslate(transform, 0, self.size.height);
            transform = CGAffineTransformRotate(transform, -M_PI_2);
            break;
        case UIImageOrientationUp:
        case UIImageOrientationUpMirrored:
            break;
    }
    
    switch (self.imageOrientation) {
        case UIImageOrientationUpMirrored:
        case UIImageOrientationDownMirrored:
            transform = CGAffineTransformTranslate(transform, self.size.width, 0);
            transform = CGAffineTransformScale(transform, -1, 1);
            break;
            
        case UIImageOrientationLeftMirrored:
        case UIImageOrientationRightMirrored:
            transform = CGAffineTransformTranslate(transform, self.size.height, 0);
            transform = CGAffineTransformScale(transform, -1, 1);
            break;
        case UIImageOrientationUp:
        case UIImageOrientationDown:
        case UIImageOrientationLeft:
        case UIImageOrientationRight:
            break;
    }
    
    // Now we draw the underlying CGImage into a new context, applying the transform
    // calculated above.
    CGContextRef ctx = CGBitmapContextCreate(NULL, self.size.width, self.size.height,
                                             CGImageGetBitsPerComponent(self.CGImage), 0,
                                             CGImageGetColorSpace(self.CGImage),
                                             CGImageGetBitmapInfo(self.CGImage));
    CGContextConcatCTM(ctx, transform);
    switch (self.imageOrientation) {
        case UIImageOrientationLeft:
        case UIImageOrientationLeftMirrored:
        case UIImageOrientationRight:
        case UIImageOrientationRightMirrored:
            // Grr...
            CGContextDrawImage(ctx, CGRectMake(0,0,self.size.height,self.size.width), self.CGImage);
            break;
            
        default:
            CGContextDrawImage(ctx, CGRectMake(0,0,self.size.width,self.size.height), self.CGImage);
            break;
    }
    
    // And now we just create a new UIImage from the drawing context
    CGImageRef cgimg = CGBitmapContextCreateImage(ctx);
    UIImage *img = [UIImage imageWithCGImage:cgimg];
    CGContextRelease(ctx);
    CGImageRelease(cgimg);
    return img;
}

@end


//--------------------------------------
//  UIAlertController
//--------------------------------------

@implementation ISN_BuildInfo
-(id) init {return [super init]; }
@end



//--------------------------------------
//  UIAlertController
//--------------------------------------


@implementation ISN_UIAlertAction
-(id) init {return [super init]; }
@end

@implementation ISN_UIAlertController
-(id) init {return [super init]; }
@end

@implementation ISN_UIAlertActionId
-(id) init {return [super init]; }
@end

//--------------------------------------
//  Push Notifications
//--------------------------------------

@implementation ISN_UIRegisterRemoteNotificationsResult 
-(id) init {return [super init]; }
@end

@implementation ISN_UIApplicationEvents
-(id) init { return self = [super init]; }
-(void)init:(NSString *)eventName data:(NSString *)data{
    self.m_EventName = eventName;
    self.m_Data = data;
}
@end

@implementation ISN_UIWheelPickerResult
-(id) init { return [super init]; }
@end

@implementation ISN_UIWheelPickerRequest
-(id) init { return [super init]; }
@end


