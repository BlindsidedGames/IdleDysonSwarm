#import <Cocoa/Cocoa.h>
#import <Metal/Metal.h>
#import <MetalKit/MetalKit.h>
#include <node_api.h>

// A child view in the existing Electron window: input and accessibility stay
// with Chromium, while a real Metal presentation lets Steam hook the drawable.
@interface IDSSteamMetalView : MTKView
@end
@implementation IDSSteamMetalView
- (NSView*)hitTest:(NSPoint)point { return nil; }
@end
@interface IDSSteamPresenter : NSObject<MTKViewDelegate>
@property(strong) id<MTLCommandQueue> queue;
@property(strong) id<MTLRenderPipelineState> pipeline;
@property(strong) id<MTLTexture> texture;
@end
@implementation IDSSteamPresenter
- (void)mtkView:(MTKView*)view drawableSizeWillChange:(CGSize)size {}
- (void)drawInMTKView:(MTKView*)view {
  @autoreleasepool {
    if(!self.texture)return;
    MTLRenderPassDescriptor* pass=view.currentRenderPassDescriptor;
    id<CAMetalDrawable> drawable=view.currentDrawable;
    if(!pass || !drawable)return;
    id<MTLCommandBuffer> command=[self.queue commandBuffer];
    id<MTLRenderCommandEncoder> encoder=[command renderCommandEncoderWithDescriptor:pass];
    [encoder setRenderPipelineState:self.pipeline];
    [encoder setFragmentTexture:self.texture atIndex:0];
    [encoder drawPrimitives:MTLPrimitiveTypeTriangle vertexStart:0 vertexCount:3];
    [encoder endEncoding]; [command presentDrawable:drawable]; [command commit];
  }
}
@end
static IDSSteamPresenter* presenter;
static IDSSteamMetalView* surface;
static napi_value failure(napi_env env,const char* message){napi_throw_error(env,nullptr,message);return nullptr;}
static napi_value success(napi_env env){napi_value v;napi_get_boolean(env,true,&v);return v;}

napi_value idsMetalAttach(napi_env env,napi_callback_info info) {
  size_t argc=1; napi_value args[1]; napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);
  void* bytes=nullptr;size_t size=0;
  if(argc!=1 || napi_get_buffer_info(env,args[0],&bytes,&size)!=napi_ok || size!=sizeof(void*))return failure(env,"Invalid native window handle");
  if(surface)return failure(env,"Metal presentation already attached");
  NSView* parent=(__bridge NSView*)*(void**)bytes;
  id<MTLDevice> device=MTLCreateSystemDefaultDevice();
  if(!parent || !device)return failure(env,"Metal presentation unavailable");
  NSString* shader=@"#include <metal_stdlib>\nusing namespace metal;\nstruct V{float4 position [[position]];float2 uv;};\nvertex V vertexMain(uint i [[vertex_id]]){float2 p[3]={float2(-1,-1),float2(3,-1),float2(-1,3)};V v;v.position=float4(p[i],0,1);v.uv=float2((p[i].x+1)/2,(1-p[i].y)/2);return v;}\nfragment float4 fragmentMain(V v [[stage_in]],texture2d<float> tex [[texture(0)]]){constexpr sampler s(filter::linear,address::clamp_to_edge);return tex.sample(s,v.uv);}";
  NSError* error=nil;
  id<MTLLibrary> library=[device newLibraryWithSource:shader options:nil error:&error];
  if(!library)return failure(env,"Metal shader compilation failed");
  MTLRenderPipelineDescriptor* descriptor=[MTLRenderPipelineDescriptor new];
  descriptor.vertexFunction=[library newFunctionWithName:@"vertexMain"];
  descriptor.fragmentFunction=[library newFunctionWithName:@"fragmentMain"];
  descriptor.colorAttachments[0].pixelFormat=MTLPixelFormatBGRA8Unorm;
  id<MTLRenderPipelineState> pipeline=[device newRenderPipelineStateWithDescriptor:descriptor error:&error];
  if(!pipeline)return failure(env,"Metal pipeline unavailable");
  presenter=[IDSSteamPresenter new];presenter.queue=[device newCommandQueue];presenter.pipeline=pipeline;
  surface=[[IDSSteamMetalView alloc] initWithFrame:parent.bounds device:device];
  surface.autoresizingMask=NSViewWidthSizable|NSViewHeightSizable;
  surface.colorPixelFormat=MTLPixelFormatBGRA8Unorm;
  surface.preferredFramesPerSecond=60;
  surface.hidden=YES;
  surface.delegate=presenter;
  [parent addSubview:surface];
  return success(env);
}
napi_value idsMetalFrame(napi_env env,napi_callback_info info) {
  size_t argc=3;napi_value args[3];napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);
  void* bytes=nullptr;size_t size=0;uint32_t width=0,height=0;
  if(!surface || argc!=3 || napi_get_buffer_info(env,args[0],&bytes,&size)!=napi_ok || napi_get_value_uint32(env,args[1],&width)!=napi_ok || napi_get_value_uint32(env,args[2],&height)!=napi_ok || !width || !height || width>16384 || height>16384 || size!=(size_t)width*height*4)return failure(env,"Invalid Metal frame");
  // New texture per upload avoids CPU writes racing an in-flight GPU read.
  MTLTextureDescriptor* descriptor=[MTLTextureDescriptor texture2DDescriptorWithPixelFormat:MTLPixelFormatBGRA8Unorm width:width height:height mipmapped:NO];
  descriptor.usage=MTLTextureUsageShaderRead;
  id<MTLTexture> texture=[surface.device newTextureWithDescriptor:descriptor];
  if(!texture)return failure(env,"Metal texture allocation failed");
  [texture replaceRegion:MTLRegionMake2D(0,0,width,height) mipmapLevel:0 withBytes:bytes bytesPerRow:width*4];
  presenter.texture=texture;surface.hidden=NO;
  return success(env);
}
napi_value idsMetalPaused(napi_env env,napi_callback_info info){
  size_t argc=1;napi_value args[1];bool paused=true;napi_get_cb_info(env,info,&argc,args,nullptr,nullptr);
  if(argc!=1 || napi_get_value_bool(env,args[0],&paused)!=napi_ok)return failure(env,"Invalid presentation pause state");
  surface.paused=paused;return success(env);
}
napi_value idsMetalDetach(napi_env env,napi_callback_info info){
  surface.paused=YES;surface.delegate=nil;[surface removeFromSuperview];surface=nil;presenter=nil;return success(env);
}
