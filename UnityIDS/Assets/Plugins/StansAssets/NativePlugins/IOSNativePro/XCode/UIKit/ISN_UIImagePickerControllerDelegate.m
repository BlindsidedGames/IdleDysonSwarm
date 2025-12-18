#if !TARGET_OS_TV
#import "ISN_UIImagePickerControllerDelegate.h"
@implementation ISN_UIImagePickerControllerDelegate



-(void) imagePickerControllerDidCancel:(UIImagePickerController *)picker {
    
    NSLog(@"imagePickerControllerDidCancel");
    
    UIViewController *vc =  UnityGetGLViewController();
    [vc dismissViewControllerAnimated:YES completion:nil];
    
    SA_Error * error = [[SA_Error alloc] initWithCode:1 message:@"PickerControllerDidCancel"];
    ISN_UIPickerControllerResult *result = [[ISN_UIPickerControllerResult alloc] initWithError:error];
    
    ISN_SendMessage(UNITY_UI_LISTENER, "didFinishPickingMedia", [result toJSONString]);
}



-(void) imagePickerController:(UIImagePickerController *)picker didFinishPickingMediaWithInfo:(NSDictionary *)info {
    UIViewController *vc =  UnityGetGLViewController();
    [vc dismissViewControllerAnimated:YES completion:nil];
    
    ISN_UIPickerControllerResult *result = [[ISN_UIPickerControllerResult alloc] init];
    
    UIImage *photo = [info objectForKey:UIImagePickerControllerOriginalImage];
    if(photo != NULL) {
        NSString *encodedImage = [self EncodeImage:photo];
        [result setM_EncodedImage:encodedImage];
    }
    
    NSURL *mediaUrl = (NSURL*)[info objectForKey:UIImagePickerControllerMediaURL];
    if(mediaUrl != NULL) {
        NSString *path = [mediaUrl absoluteString];
        if (@available(iOS 13.0, *)) {
            path = [self iOS13MediaUrlFix:[mediaUrl path]];
        }
        [result setM_MediaUrl:path];
    }
    
    if (@available(iOS 11.0, *)) {
        NSURL *imageUrl = (NSURL*)[info objectForKey:UIImagePickerControllerImageURL];
        if(imageUrl != NULL) {
            NSString *path = [imageUrl absoluteString];
            [result setM_ImageUrl:path];
        }
    } else {
        [ISN_Logger Log:@"imageUrl param does not supported on this iOS version"];
    }

    NSString* mediaType = [info objectForKey:UIImagePickerControllerMediaType];
    [result setM_MediaType:mediaType];
    
    ISN_SendMessage(UNITY_UI_LISTENER, "didFinishPickingMedia", [result toJSONString]);
}

-(NSString*) iOS13MediaUrlFix:(NSString*) moviePath {
    NSArray* spliteArray = [moviePath componentsSeparatedByString: @"/"];
    NSString* lastString = [spliteArray lastObject];
    NSError *error;
    NSFileManager *fileManager = [NSFileManager defaultManager];
    NSString *documentsDirectory = [NSHomeDirectory() stringByAppendingPathComponent:@"tmp"];
    NSString *filePath = [documentsDirectory stringByAppendingPathComponent:lastString];
    [fileManager copyItemAtPath:moviePath toPath:filePath error:&error];
    
    NSString* mediaPath = [NSString stringWithFormat:@"%@%@", @"file:///private", filePath];
    return mediaPath;
}


- (NSString*) EncodeImage:(UIImage *)image {
    image = [image fixOrientation];
    
    int encodingType = [self.controllerRequest m_EncodingType];
    int maxImageSize = [self.controllerRequest m_MaxImageSize];
    
    if(image.size.width >  maxImageSize || image.size.height > maxImageSize ) {
        [ISN_Logger Log:@"resizing image"];
        CGSize s = CGSizeMake(maxImageSize, maxImageSize);
        
        if(image.size.width > image.size.height) {
            CGFloat new_height = maxImageSize / (image.size.width / image.size.height);
            s.height = new_height;
            
        } else {
            CGFloat new_width = maxImageSize / (image.size.height / image.size.width);
            s.width = new_width;
            
        }
        image =  [self imageWithImage:image scaledToSize:s];
    }
    
    NSString* imageData;
    if(encodingType == 0) // PNG encoding
    {
        imageData = ISN_ConvertImageToBase64(image);
    }
    else // JPEG encoding
    {
        float imageCompressionRate = [self.controllerRequest m_ImageCompressionRate];
        imageData = ISN_ConvertImageToJPEGBase64(image, imageCompressionRate);
    }
    
    return imageData;
}



- (UIImage *)imageWithImage:(UIImage *)image scaledToSize:(CGSize)newSize {
    //UIGraphicsBeginImageContext(newSize);
    // In next line, pass 0.0 to use the current device's pixel scaling factor (and thus account for Retina resolution).
    // Pass 1.0 to force exact pixel size.
    UIGraphicsBeginImageContextWithOptions(newSize, NO, 1.0);
    [image drawInRect:CGRectMake(0, 0, newSize.width, newSize.height)];
    UIImage *newImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return newImage;
}

@end



#endif
