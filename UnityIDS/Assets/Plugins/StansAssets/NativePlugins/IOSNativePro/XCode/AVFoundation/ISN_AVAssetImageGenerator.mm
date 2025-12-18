#import "ISN_Foundation.h"
#import <AVFoundation/AVFoundation.h>


extern "C" void* _ISN_CopyCGImageAtTime(char* url, double seconds)
{
    [ISN_Logger LogNativeMethodInvoke:"_ISN_CopyCGImageAtTime" data:url];
    
    NSString* assetUrl = [NSString stringWithUTF8String: url];
    NSURL *mediaUrl = [NSURL fileURLWithPath:assetUrl];
    
    AVURLAsset *asset = [[AVURLAsset alloc] initWithURL:mediaUrl options:nil];
    
    AVAssetImageGenerator *gen = [[AVAssetImageGenerator alloc] initWithAsset:asset];
    gen.appliesPreferredTrackTransform = YES;
    CMTime time = CMTimeMakeWithSeconds(seconds, 600);
    NSError *error = nil;
    CMTime actualTime;
    
    CGImageRef image = [gen copyCGImageAtTime:time actualTime:&actualTime error:&error];
    UIImage *thumb = [[UIImage alloc] initWithCGImage:image];
    CGImageRelease(image);
    
    NSMutableData* imageData;
    if(thumb != NULL) {
        imageData  = [[NSMutableData alloc] initWithData:UIImageJPEGRepresentation(thumb, 0.8)];
        
         NSLog(@"imageData: %lu", (unsigned long)imageData.length);
        
    } else {
        imageData = [[NSMutableData alloc] init];
    }
    return (void*) CFBridgingRetain(imageData);
}
