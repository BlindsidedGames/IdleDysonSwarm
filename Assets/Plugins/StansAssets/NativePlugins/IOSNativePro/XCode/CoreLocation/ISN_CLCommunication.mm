#if !TARGET_OS_TV

#import "ISN_CLCommunication.h"


@implementation ISN_CLLocationCoordinate2D

-(id) initWithCLLocationCoordinate2D:(CLLocationCoordinate2D ) location {
    self = [super init];
    if(self) {
        self.m_Latitude = location.latitude;
        self.m_Longitude = location.longitude;
    }
    return self;
}
-(CLLocationCoordinate2D) getCLLocationCoordinate2D {
   return  CLLocationCoordinate2DMake(self.m_Latitude, self.m_Longitude);
}

@end

@implementation ISN_CLCircularRegion

-(id) initWithCLLocationCoordinate2D:(CLCircularRegion *) region {
    
    self = [super init];
    if(self) {
        self.m_Identifier = region.identifier;
        self.m_NotifyOnEntry = region.notifyOnEntry;
        self.m_NotifyOnExit = region.notifyOnExit;
        self.m_Radius = region.radius;
        self.m_Center = [[ISN_CLLocationCoordinate2D alloc] initWithCLLocationCoordinate2D:region.center];
    }
    return self;
}
-(CLCircularRegion *) getCLCircularRegion {
    
    CLCircularRegion* region = [[CLCircularRegion alloc]
                                initWithCenter:[self.m_Center getCLLocationCoordinate2D]
                                radius:self.m_Radius identifier:
                                self.m_Identifier];
   
    region.notifyOnExit = self.m_NotifyOnExit;
    region.notifyOnEntry = self.m_NotifyOnEntry;
    
    return  region;
}
@end


@implementation ISN_CLLocation

-(id) initWithCLLocation:(CLLocation *) location {
    self = [super init];
    if(self) {

        self.m_Coordinate = [[ISN_CLLocationCoordinate2D alloc] initWithCLLocationCoordinate2D:location.coordinate];
        self.m_Altitude = location.altitude;
        if(location.floor != NULL) {
            self.m_Floor = (int) location.floor.level;
        } else {
             self.m_Floor  = -1;
        }

        self.m_Speed = location.speed;
        self.m_Course = location.course;
        self.m_Timestamp = [location.timestamp timeIntervalSince1970];
        self.m_HorizontalAccuracy = location.horizontalAccuracy;
        self.m_VerticalAccuracy = location.verticalAccuracy;
    }
    return self;
}

- (CLLocation *) getCLLocation {
    
    NSDate* timestamp = [[NSDate alloc] initWithTimeIntervalSince1970:self.m_Timestamp];
    CLLocationCoordinate2D coordinate2D = [self.m_Coordinate getCLLocationCoordinate2D];
    
    CLLocation * result = [[CLLocation alloc] initWithCoordinate:coordinate2D altitude:self.m_Altitude horizontalAccuracy:self.m_HorizontalAccuracy verticalAccuracy:self.m_VerticalAccuracy timestamp:timestamp];
    
    return result;
}

@end

@implementation ISN_CLLocationArray
    -(id) init {return [super init]; }
@end

#endif
