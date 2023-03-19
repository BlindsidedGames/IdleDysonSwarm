//
//  ISN_CLLocationManager.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2/25/19.
//

#if !TARGET_OS_TV

#import <Foundation/Foundation.h>
#import <CoreLocation/CoreLocation.h>

#import "ISN_Foundation.h"
#import "ISN_CLCommunication.h"




//delegate
static UnityAction didChangeAuthorizationStatus;

static UnityAction didUpdateLocations;
static UnityAction didFailWithError;
static UnityAction didFinishDeferredUpdatesWithError;

static UnityAction locationManagerDidPauseLocationUpdates;
static UnityAction locationManagerDidResumeLocationUpdates;


@interface ISN_CLLocationManagerDelegate : NSObject<CLLocationManagerDelegate>
@end

@implementation ISN_CLLocationManagerDelegate

//Responding to Authorization Changes

-(void) locationManager:(CLLocationManager *)manager didChangeAuthorizationStatus:(CLAuthorizationStatus)status {
    ISN_SendCallbackToUnity(didChangeAuthorizationStatus, [NSString stringWithFormat:@"%d", status]);
}

//Responding to Location Events

-(void) locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations {
    
    NSMutableArray <ISN_CLLocation>* isn_locations = [[NSMutableArray<ISN_CLLocation> alloc] init];
    ISN_CLLocationArray* result = [[ISN_CLLocationArray alloc] init];
    for (CLLocation * location : locations) {
        ISN_CLLocation* isn_location = [[ISN_CLLocation alloc] initWithCLLocation:location];
        [isn_locations addObject:isn_location];
    }
    
    [result setM_Locations:isn_locations];
    ISN_SendCallbackToUnity(didUpdateLocations, [result toJSONString]);
    
}

-(void) locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error {
    SA_Error* sa_error = [[SA_Error alloc] initWithNSError:error];
    ISN_SendCallbackToUnity(didFailWithError, [sa_error toJSONString]);
}

-(void) locationManager:(CLLocationManager *)manager didFinishDeferredUpdatesWithError:(NSError *)error {
    SA_Error* sa_error = [[SA_Error alloc] initWithNSError:error];
    ISN_SendCallbackToUnity(didFinishDeferredUpdatesWithError, [sa_error toJSONString]);
}


//Pausing Location Updates
-(void) locationManagerDidPauseLocationUpdates:(CLLocationManager *)manager {
     ISN_SendCallbackToUnity(locationManagerDidPauseLocationUpdates, NULL);
}

-(void) locationManagerDidResumeLocationUpdates:(CLLocationManager *)manager {
    ISN_SendCallbackToUnity(locationManagerDidResumeLocationUpdates, NULL);
    
}


- (void)locationManager:(CLLocationManager *)manager
       didUpdateHeading:(CLHeading *)newHeading {}

- (BOOL)locationManagerShouldDisplayHeadingCalibration:(CLLocationManager *)manager  { return true;}

- (void)locationManager:(CLLocationManager *)manager
      didDetermineState:(CLRegionState)state forRegion:(CLRegion *)region {}

- (void)locationManager:(CLLocationManager *)manager
        didRangeBeacons:(NSArray<CLBeacon *> *)beacons inRegion:(CLBeaconRegion *)region {}

- (void)locationManager:(CLLocationManager *)manager
rangingBeaconsDidFailForRegion:(CLBeaconRegion *)region
              withError:(NSError *)error {}

- (void)locationManager:(CLLocationManager *)manager
         didEnterRegion:(CLRegion *)region {}

- (void)locationManager:(CLLocationManager *)manager
          didExitRegion:(CLRegion *)region {}

- (void)locationManager:(CLLocationManager *)manager
monitoringDidFailForRegion:(nullable CLRegion *)region
              withError:(NSError *)error {}

- (void)locationManager:(CLLocationManager *)manager
didStartMonitoringForRegion:(CLRegion *)region {}

- (void)locationManager:(CLLocationManager *)manager didVisit:(CLVisit *)visit {}




@end


extern "C" {
    
    __strong static CLLocationManager* s_LocationManager;
    __strong static ISN_CLLocationManagerDelegate* s_LocationDelegate;
    
    CLLocationManager* GetLocationManager() {
        while (s_LocationManager == nil) {
            s_LocationManager = [[CLLocationManager alloc] init];
        }
        return s_LocationManager;
    }
    
    
    bool _ISN_CL_LocationServicesEnabled() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_LocationServicesEnabled" data:""];
        return [CLLocationManager locationServicesEnabled];
    }
    
    int _ISN_CL_AuthorizationStatus() {
         [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_AuthorizationStatus" data:""];
        return (int) [CLLocationManager authorizationStatus];
    }
    
    void _ISN_CL_SetDelegate(UnityAction authorization, UnityAction update, UnityAction error, UnityAction finishDeferred, UnityAction pause, UnityAction resume) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_SetDelegate" data:""];
        didChangeAuthorizationStatus = authorization;
        didUpdateLocations = update;
        didFailWithError = error;
        didFinishDeferredUpdatesWithError = finishDeferred;
        
        locationManagerDidPauseLocationUpdates = pause;
        locationManagerDidResumeLocationUpdates = resume;
        
        s_LocationDelegate = [[ISN_CLLocationManagerDelegate alloc] init];
        [GetLocationManager() setDelegate:s_LocationDelegate];
    }
   
    void _ISN_CL_RequestAlwaysAuthorization() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_RequestAlwaysAuthorization" data:""];
        [GetLocationManager() requestAlwaysAuthorization];
    }
    
    void _ISN_CL_RequestWhenInUseAuthorization() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_RequestWhenInUseAuthorization" data:""];
        [GetLocationManager() requestWhenInUseAuthorization];
    }
    
    void _ISN_CL_RequestLocation() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_RequestLocation" data:""];

        [GetLocationManager() requestLocation];
    }
    
    void _ISN_CL_StartUpdatingLocation() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_StartUpdatingLocation" data:""];
        [GetLocationManager() startUpdatingLocation];
    }
    
    void _ISN_CL_StopUpdatingLocation() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_StopUpdatingLocation" data:""];
        [GetLocationManager() stopUpdatingLocation];
    }
    
    bool _ISN_CL_PausesLocationUpdatesAutomatically() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_PausesLocationUpdatesAutomatically" data:""];
        return [GetLocationManager()  pausesLocationUpdatesAutomatically];
    }
    
    void _ISN_CL_SetPausesLocationUpdatesAutomatically(bool value) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_SetPausesLocationUpdatesAutomatically" data:""];
        [GetLocationManager() setPausesLocationUpdatesAutomatically:value];
    }
    
    void _ISN_CL_SetAllowsBackgroundLocationUpdates(bool value) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_SetAllowsBackgroundLocationUpdates" data:""];
        [GetLocationManager() setAllowsBackgroundLocationUpdates:value];
    }
    
    bool _ISN_CL_AllowsBackgroundLocationUpdates() {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_AllowsBackgroundLocationUpdates" data:""];
        return [GetLocationManager()  allowsBackgroundLocationUpdates];
    }
    
    void _ISN_CL_SetDistanceFilter(double distance) {
        GetLocationManager().distanceFilter = distance;
    }
    
    double _ISN_CL_GetDistanceFilter() {
        return GetLocationManager().distanceFilter;
    }
    
    
    void _ISN_CL_SetDesiredAccuracy(int value) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_SetDesiredAccuracy" data:""];
        switch (value) {
            case 0:
                break;
                GetLocationManager().desiredAccuracy =  kCLLocationAccuracyBest;
            case 1:
                GetLocationManager().desiredAccuracy = kCLLocationAccuracyNearestTenMeters;
                break;
                
            case 2:
                GetLocationManager().desiredAccuracy = kCLLocationAccuracyHundredMeters;
                break;
                
            case 3:
                GetLocationManager().desiredAccuracy = kCLLocationAccuracyKilometer;
                break;
                
            case 4:
                GetLocationManager().desiredAccuracy = kCLLocationAccuracyThreeKilometers;
                break;
                
            case 5:
                GetLocationManager().desiredAccuracy = kCLLocationAccuracyBestForNavigation;
                break;
            default:
                break;
        }
    }
    
    
    double _ISN_CL_Cllocation_DistanceFromLocation(char * location1, char* location2) {
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_Cllocation_DistanceFromLocation_location1" data:location1];
        [ISN_Logger LogNativeMethodInvoke:"_ISN_CL_Cllocation_DistanceFromLocation_location1" data:location2];
        
        
        NSError *jsonError;
        ISN_CLLocation *loc1 = [[ISN_CLLocation alloc] initWithChar:location1 error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_LoadStore JSON parsing error: %@", jsonError.description];
        }
        
        ISN_CLLocation *loc2 = [[ISN_CLLocation alloc] initWithChar:location2 error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_LoadStore JSON parsing error: %@", jsonError.description];
        }
        
        return [loc1.getCLLocation distanceFromLocation:loc2.getCLLocation];
    }
}
#endif
