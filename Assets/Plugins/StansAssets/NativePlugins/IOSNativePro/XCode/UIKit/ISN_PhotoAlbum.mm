//
//  ISN_PhotoAlbum.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-03-26.
//

#import <UIKit/UIKit.h>
#import <Foundation/Foundation.h>

#import "ISN_Foundation.h"

static UnityAction OnImageSavedToPhotosAlbum;
static UnityAction OnVideoSavedToPhotosAlbum;

@interface ISN_PhotoAlbum : NSObject
@end


@implementation ISN_PhotoAlbum

static ISN_PhotoAlbum * s_sharedInstance;

+ (id)sharedInstance {
    if (s_sharedInstance == nil)  {
        s_sharedInstance = [[self alloc] init];
    }
    return s_sharedInstance;
}

- (void) writeToSavedPhotosAlbum:(UIImage *)image {
#if !TARGET_OS_TV
    UIImageWriteToSavedPhotosAlbum(image,
                                   self,
                                   @selector(onImageSave:hasBeenSavedInPhotoAlbumWithError:usingContextInfo:),
                                   NULL);
#endif
}

- (void)onImageSave:(UIImage *)image hasBeenSavedInPhotoAlbumWithError:(NSError *)error usingContextInfo:(void*)ctxInfo
{
    SA_Result * result = [[SA_Result alloc] initWithNSError:error];
    ISN_SendCallbackToUnity(OnImageSavedToPhotosAlbum, [result toJSONString]);
}

- (void) saveVideoAtPathToSavedPhotosAlbum:(NSString *)videoPath {
#if !TARGET_OS_TV
    UISaveVideoAtPathToSavedPhotosAlbum(videoPath,
                                   self,
                                   @selector(onVideoSaved:hasBeenSavedInPhotoAlbumWithError:usingContextInfo:),
                                   NULL);
#endif
}

- (void)onVideoSaved:(UIImage *)image hasBeenSavedInPhotoAlbumWithError:(NSError *)error usingContextInfo:(void*)ctxInfo
{
    SA_Result * result = [[SA_Result alloc] initWithNSError:error];
    ISN_SendCallbackToUnity(OnVideoSavedToPhotosAlbum, [result toJSONString]);
}

@end

extern "C" {
    
    void _ISN_UIImageWriteToSavedPhotosAlbum(int length, Byte *byteArrPtr, UnityAction callback) {
        NSData *imageData = [NSData dataWithBytes:byteArrPtr length:length];
        UIImage *image = [UIImage imageWithData:imageData];
        
        OnImageSavedToPhotosAlbum = callback;
        [[ISN_PhotoAlbum sharedInstance] writeToSavedPhotosAlbum:image];
    }
    
    BOOL _ISN_UIVideoAtPathIsCompatibleWithSavedPhotosAlbum(char* videoPath) {
#if !TARGET_OS_TV
        return UIVideoAtPathIsCompatibleWithSavedPhotosAlbum([NSString stringWithUTF8String: videoPath]);
#else
        return false;
#endif
    }

    void _ISN_UISaveVideoAtPathToSavedPhotosAlbum(char* videoPath, UnityAction callback) {
        OnVideoSavedToPhotosAlbum = callback;
        [[ISN_PhotoAlbum sharedInstance] saveVideoAtPathToSavedPhotosAlbum:[NSString stringWithUTF8String: videoPath]];
    }
}

