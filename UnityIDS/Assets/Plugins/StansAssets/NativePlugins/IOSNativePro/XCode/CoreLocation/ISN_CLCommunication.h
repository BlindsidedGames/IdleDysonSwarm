#import "JSONModel.h"
#import "ISN_Foundation.h"

#import <CoreLocation/CoreLocation.h>


@protocol ISN_CLLocationCoordinate2D;
@interface ISN_CLLocationCoordinate2D : JSONModel
@property (nonatomic) double m_Latitude;
@property (nonatomic) double m_Longitude;

-(id) initWithCLLocationCoordinate2D:(CLLocationCoordinate2D ) location;
-(CLLocationCoordinate2D ) getCLLocationCoordinate2D;

@end

@interface ISN_CLCircularRegion : JSONModel
@property (nonatomic) NSString* m_Identifier;
@property (nonatomic) bool m_NotifyOnEntry;
@property (nonatomic) bool m_NotifyOnExit;
@property (nonatomic) float m_Radius;
@property (nonatomic) ISN_CLLocationCoordinate2D* m_Center;

-(id) initWithCLLocationCoordinate2D:(CLCircularRegion *) region;
-(CLCircularRegion *) getCLCircularRegion;

@end


@protocol ISN_CLLocation;
@interface ISN_CLLocation : JSONModel
@property (nonatomic) ISN_CLLocationCoordinate2D* m_Coordinate;
@property (nonatomic) double m_Altitude;
@property (nonatomic) int m_Floor;
@property (nonatomic) double m_Speed;
@property (nonatomic) double m_Course;
@property (nonatomic) long m_Timestamp;
@property (nonatomic) double m_HorizontalAccuracy;
@property (nonatomic) double m_VerticalAccuracy;

-(id) initWithCLLocation:(CLLocation *) location;
-(CLLocation *) getCLLocation;
@end

@protocol ISN_CLLocationArray;
@interface ISN_CLLocationArray : JSONModel
@property (nonatomic) NSArray <ISN_CLLocation>* m_Locations;
@end

