////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

#import <Foundation/Foundation.h>
#import "ISN_Foundation.h"


static UnityAction OnDatePickedCallback;
static UnityAction OnDateChangedCallback;


@protocol ISN_UIDateTimePicker;
@interface ISN_UIDateTimePicker : JSONModel
@property (nonatomic) int m_MinuteInterval;
@property (nonatomic) int m_DatePickerMode;
@property (nonatomic) long m_StartDate;
@property (nonatomic) long m_CountDownDuration;
@end


@implementation ISN_UIDateTimePicker
-(id) init {return [super init]; }
@end

@interface ISN_UIDateTime : NSObject
+ (id)sharedInstance;
@end

@interface UIView (ZolaZoomSnapshot)
- (UIImage *)zo_snapshot;
@end

@protocol ZOZolaZoomTransitionDelegate;

typedef NS_ENUM(NSInteger, ZOTransitionType) {
    ZOTransitionTypePresenting,
    ZOTransitionTypeDismissing
};

@interface ZOZolaZoomTransition : NSObject <UIViewControllerAnimatedTransitioning>

- (instancetype)initWithTargetView:(UIView *)targetView
                              type:(ZOTransitionType)type
                          duration:(NSTimeInterval)duration
                          delegate:(id<ZOZolaZoomTransitionDelegate>)delegate NS_DESIGNATED_INITIALIZER;


+ (instancetype)transitionFromView:(UIView *)targetView
                              type:(ZOTransitionType)type
                          duration:(NSTimeInterval)duration
                          delegate:(id<ZOZolaZoomTransitionDelegate>)delegate;


- (instancetype)init NS_UNAVAILABLE;


@property (strong, nonatomic) UIColor *fadeColor;
@property (weak, nonatomic) id<ZOZolaZoomTransitionDelegate> delegate;
@property (strong, nonatomic) UIView *targetView;
@property (assign, nonatomic) ZOTransitionType type;
@property (assign, nonatomic) NSTimeInterval duration;

@end

@protocol ZOZolaZoomTransitionDelegate <NSObject>

@required


- (CGRect)zolaZoomTransition:(ZOZolaZoomTransition *)zoomTransition
        startingFrameForView:(UIView *)targetView
              relativeToView:(UIView *)relativeView
          fromViewController:(UIViewController *)fromViewController
            toViewController:(UIViewController *)toViewController;


- (CGRect)zolaZoomTransition:(ZOZolaZoomTransition *)zoomTransition
       finishingFrameForView:(UIView *)targetView
              relativeToView:(UIView *)relativeView
          fromViewController:(UIViewController *)fromViewController
            toViewController:(UIViewController *)toViewController;

@optional

- (NSArray *)supplementaryViewsForZolaZoomTransition:(ZOZolaZoomTransition *)zoomTransition;

- (CGRect)zolaZoomTransition:(ZOZolaZoomTransition *)zoomTransition
   frameForSupplementaryView:(UIView *)supplementaryView
              relativeToView:(UIView *)relativeView;

@end

@interface MonthLayerCollectionViewCell : UICollectionViewCell
@property CATextLayer *monthTitle;
@property int startWeekDay, numberOfDays;
- (void)setStartDay:(int)startDay;
- (void)setNumberOfDays:(int)numberOfDays;
@end

@interface CalendarPickerController : UINavigationController
+ (instancetype)defaultPicker;
+ (instancetype)initWithStartYear:(NSInteger)calendarStartYear endYear:(NSInteger)calendarEndYear withStartDayIsSunday:(BOOL)startDayIsSunday;
@property NSBundle *bundle;
@property NSCalendar *calendar;
@property NSArray<NSString *> *monthNames, *dayNumberStrings;
#if !TARGET_OS_TV
@property UIToolbar* topToolbar;
#endif
@property BOOL startDayIsSunday;
@end

@interface MonthViewController : UICollectionViewController
+ (instancetype)defaultControllerWithYear:(NSInteger)year andMonth:(NSInteger)month withStartDayIsSunday:(BOOL)startDayIsSunday;
@property NSInteger year, currentMonth;
@property NSCalendar *calendar;
@property NSArray<NSString *> *monthNames, *dayNumberStrings;
@property NSMutableDictionary *cellDaysDataByIndexPath;
@property CGSize itemSize;
@property BOOL startDayIsSunday;
@property NSArray *holidays;
@end

@interface YearViewController : UICollectionViewController<UINavigationControllerDelegate, ZOZolaZoomTransitionDelegate>
+ (instancetype) initWithStartYear:(NSInteger)calendarStartYear endYear:(NSInteger)calendarEndYear withStartDayIsSunday:(BOOL)startDayIsSunday;
+ (instancetype) defaultController;

@property NSDate *currentDate;
@property NSInteger startYear, endYear, currentYear;
@property NSCalendar *calendar;
@property NSMutableArray<NSNumber *> *startWeekdays, *numberOfDays;
@property NSArray<NSString *> *monthNames, *dayNumberStrings;
@property NSMutableDictionary *cellDaysDataByIndexPath;
@property CGSize itemSize;
@property BOOL startDayIsSunday;
@property UIView *viewForZooming;
@end

@interface YearSectionHeaderReusableView : UICollectionReusableView
@property CATextLayer *yearTitle;
@property CALayer *bottomLine;
@end

@interface LCTextLayer : CATextLayer
@end

@interface DayInYearViewCell : UICollectionViewCell
@property LCTextLayer *dayNumber;
@property CALayer *topLine;
@end

@interface MonthSectionHeaderReusableView : UICollectionReusableView

@property CATextLayer *monthTitle;
@property CGFloat offset, width;

@end




@implementation ISN_UIDateTime

static ISN_UIDateTime * na_sharedInstance;

+ (id)sharedInstance {
    
    if (na_sharedInstance == nil)  {
        na_sharedInstance = [[self alloc] init];
    }
    
    return na_sharedInstance;
}


- (CGFloat) GetW {
    
    UIViewController *vc =  UnityGetGLViewController();
    
    bool IsLandscape = true;
    
#if !TARGET_OS_TV
    
    UIInterfaceOrientation orientation = [UIApplication sharedApplication].statusBarOrientation;
    if(orientation == UIInterfaceOrientationLandscapeLeft || orientation == UIInterfaceOrientationLandscapeRight) {
        IsLandscape = true;
    } else {
        IsLandscape = false;
    }
#endif
    
    CGFloat w;
    if(IsLandscape) {
        w = vc.view.frame.size.height;
    } else {
        w = vc.view.frame.size.width;
    }
    
    
    NSArray *vComp = [[UIDevice currentDevice].systemVersion componentsSeparatedByString:@"."];
    if ([[vComp objectAtIndex:0] intValue] >= 8) {
        w = vc.view.frame.size.width;
    }
    
    
    return w;
}

#if !TARGET_OS_TV

- (void)DP_changeDate:(UIDatePicker *)sender {
    
    NSDateFormatter *dateFormatter = [[NSDateFormatter alloc] init];
    
    [dateFormatter setDateFormat: @"yyyy-MM-dd HH:mm:ss"];
    NSString *dateString = [dateFormatter stringFromDate:sender.date];
    
    ISN_SendCallbackToUnity(OnDateChangedCallback, dateString);
}

-(void) DP_PickerClosed:(UIDatePicker *)sender {
    NSDateFormatter *dateFormatter = [[NSDateFormatter alloc] init];
    [dateFormatter setDateFormat: @"yyyy-MM-dd HH:mm:ss"];
    NSString *dateString = [dateFormatter stringFromDate:sender.date];
    
    ISN_SendCallbackToUnity(OnDatePickedCallback, dateString);
}

- (void)disableTouchesOnView:(UIView *)view {
    UIButton *ghostButton = [[UIButton alloc] initWithFrame:CGRectMake(0, 0, view.frame.size.width, view.frame.size.height)];
    [ghostButton setBackgroundColor:[UIColor clearColor]];
    ghostButton.tag = 42; // Any random number. Use #define to avoid putting numbers in code.
    
    [view addSubview:ghostButton];
}

UIDatePicker *datePicker;

- (void) DP_show:(ISN_UIDateTimePicker* )request {
    UIViewController *vc =  UnityGetGLViewController();
    [self disableTouchesOnView:vc.view];
    
    CGRect toolbarTargetFrame = CGRectMake(0, vc.view.bounds.size.height-216-44, [self GetW], 44);
    CGRect datePickerTargetFrame = CGRectMake(0, vc.view.bounds.size.height-216, [self GetW], 216);
    CGRect darkViewTargetFrame = CGRectMake(0, vc.view.bounds.size.height-216-44, [self GetW], 260);
    
    UIView *darkView = [[UIView alloc] initWithFrame:CGRectMake(0, vc.view.bounds.size.height, [self GetW], 260)];
    darkView.alpha = 1;
    darkView.backgroundColor = [UIColor whiteColor];
    darkView.tag = 9;
    
    UITapGestureRecognizer *tapGesture = [[UITapGestureRecognizer alloc] initWithTarget:self action:@selector(DP_dismissDatePicker:)];
    [darkView addGestureRecognizer:tapGesture];
    [vc.view addSubview:darkView];
    
    
    datePicker = [[UIDatePicker alloc] initWithFrame:CGRectMake(0, vc.view.bounds.size.height+44, [self GetW], 216)];
    if (@available(iOS 12.0, *)) {
        if([vc traitCollection].userInterfaceStyle == UIUserInterfaceStyleDark) {
            datePicker.backgroundColor = [UIColor grayColor];
            if (@available(iOS 14.0, *)) {
                darkView.backgroundColor = [UIColor blackColor];
            }
        }
    }
    
    datePicker.tag = 10;
    [datePicker addTarget:self action:@selector(DP_changeDate:) forControlEvents:UIControlEventValueChanged];
    switch (request.m_DatePickerMode) {
        case 1:
            NSLog(@"mode: UIDatePickerModeTime");
            datePicker.datePickerMode = UIDatePickerModeTime;
            break;
            
        case 2:
            NSLog(@"mode: UIDatePickerModeDate");
            datePicker.datePickerMode = UIDatePickerModeDate;
            break;
            
        case 3:
            NSLog(@"mode: UIDatePickerModeDateAndTime");
            datePicker.datePickerMode = UIDatePickerModeDateAndTime;
            break;
            
        case 4:
            NSLog(@"mode: UIDatePickerModeCountDownTimer");
            datePicker.datePickerMode = UIDatePickerModeCountDownTimer;
            break;
            
        default:
            break;
    }
    
    if (@available(iOS 13.4, *)) {
        [datePicker setPreferredDatePickerStyle:UIDatePickerStyleWheels];
    }
    
    [datePicker setMinuteInterval:request.m_MinuteInterval];
    if(request.m_CountDownDuration != -1) {
        datePicker.countDownDuration = request.m_CountDownDuration;
    }
    
    
    if(request.m_StartDate != -1) {
        [datePicker setDate:[NSDate dateWithTimeIntervalSince1970:request.m_StartDate]];
    }
        
        
    
    [vc.view addSubview:datePicker];
    
    UIToolbar *toolBar = [[UIToolbar alloc] initWithFrame:CGRectMake(0, vc.view.bounds.size.height, [self GetW], 44)];
    
    toolBar.tag = 11;
    toolBar.barStyle = UIBarStyleDefault;
    UIBarButtonItem *spacer = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace target:nil action:nil];
    UIBarButtonItem *doneButton = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemDone target:self action:@selector(DP_dismissDatePicker:)];
    
    
    [toolBar setItems:[NSArray arrayWithObjects:spacer, doneButton, nil]];
    [vc.view addSubview:toolBar];
    
    [UIView beginAnimations:@"MoveIn" context:nil];
    toolBar.frame = toolbarTargetFrame;
    datePicker.frame = datePickerTargetFrame;
    darkView.frame = darkViewTargetFrame;
    
    [UIView commitAnimations];
    
}

- (void)DP_removeViews:(id)object {
    UIViewController *vc =  UnityGetGLViewController();
    
    [[vc.view viewWithTag:9] removeFromSuperview];
    [[vc.view viewWithTag:10] removeFromSuperview];
    [[vc.view viewWithTag:11] removeFromSuperview];
    
    [[vc.view viewWithTag:42] removeFromSuperview];
}

- (void)DP_dismissDatePicker:(id)sender {
    UIViewController *vc =  UnityGetGLViewController();
    
    [self DP_PickerClosed:datePicker];
    
    CGRect toolbarTargetFrame = CGRectMake(0, vc.view.bounds.size.height, [self GetW], 44);
    CGRect datePickerTargetFrame = CGRectMake(0, vc.view.bounds.size.height+44, [self GetW], 216);
    CGRect darkViewTargetFrame = CGRectMake(0, vc.view.bounds.size.height, [self GetW], 260);
    
    
    [UIView beginAnimations:@"MoveOut" context:nil];
    [vc.view viewWithTag:9].frame = darkViewTargetFrame;
    [vc.view viewWithTag:10].frame = datePickerTargetFrame;
    [vc.view viewWithTag:11].frame = toolbarTargetFrame;
    [UIView setAnimationDelegate:self];
    [UIView setAnimationDidStopSelector:@selector(DP_removeViews:)];
    [UIView commitAnimations];
}

#endif


- (void)pickDate:(int)startYear {
#if !TARGET_OS_TV
    
    UIViewController *vc =  UnityGetGLViewController();
    UINavigationController *ctrl = [CalendarPickerController defaultPicker];
    
    [vc presentViewController:ctrl animated:YES completion:nil];
#endif
}

@end



//================
// Calendar
//================

@implementation UIView (ZolaZoomSnapshot)

- (UIImage *)zo_snapshot {
    UIGraphicsBeginImageContextWithOptions(self.bounds.size, self.opaque, [UIScreen mainScreen].scale);
    CGContextRef context = UIGraphicsGetCurrentContext();
    [self.layer renderInContext:context];
    UIImage *snapshot = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return snapshot;
}

@end

@implementation MonthLayerCollectionViewCell

- (id)initWithFrame:(CGRect)aRect {
    self = [super initWithFrame:(CGRect)aRect];
    if (self) {
        self.opaque = false;
        self.contentView.opaque = false;
        self.autoresizesSubviews = false;
        self.contentView.translatesAutoresizingMaskIntoConstraints = false;
        self.contentView.clearsContextBeforeDrawing = true;
        
        self.monthTitle = [[CATextLayer alloc] init];
        //        [self.monthTitle setFont:@"Helvetica-Light"];
        [self.monthTitle setFontSize:17];
        [self.monthTitle setAlignmentMode:kCAAlignmentLeft];
        [self.monthTitle setForegroundColor:[[UIColor redColor] CGColor]];
        [self.monthTitle setBackgroundColor:[[UIColor clearColor] CGColor]];
        self.monthTitle.contentsScale = [UIScreen mainScreen].scale;
        [self.contentView.layer addSublayer:self.monthTitle];
        
        self.startWeekDay = -1;
        self.numberOfDays = 0;
    }
    return self;
    
}

- (void)setStartDay:(int)startDay {
    if (_startWeekDay != startDay) {
        
        for (int i = startDay; i < startDay + 32; i++) {
            int number = i - startDay;
            
            if (number >= 1) {
                CATextLayer *label = [[CATextLayer alloc] init];
                [self.contentView.layer addSublayer:label];
                label.string = [NSString stringWithFormat:@"%d", number];
                //                [label setFont:@"Helvetica-Light"];
                [label setFontSize:10];
                [label setAlignmentMode:kCAAlignmentCenter];
                [label setForegroundColor:[[UIColor blackColor] CGColor]];
                label.contentsScale = [UIScreen mainScreen].scale;
            } else {
                continue;
            }
        }
        
        self.startWeekDay = startDay;
    }
}

- (void)defineNumberOfDays:(int)numberOfDays {
    
    if (numberOfDays != _numberOfDays) {
        
        NSArray *labels = self.contentView.layer.sublayers;
        
        for (int i = 28; i < labels.count; i++ ) {
            if (i <= numberOfDays) {
                ((CATextLayer *)labels[i]).string = [NSString stringWithFormat:@"%d", i];
            } else {
                ((CATextLayer *)labels[i]).string = nil;
            }
            
        }
        _numberOfDays = numberOfDays;
    }
}

- (void)layoutSubviews {
    if (_startWeekDay == -1 || _numberOfDays == 0) {
        return;
    }
    CGSize frameSize = self.frame.size;
    
    CGFloat itemWidth = ceil(frameSize.width / 7);
    CGFloat itemHeight = ceil(1.2 * itemWidth);
    
    CGFloat monthNameHeight = 24;
    
    [self.monthTitle setFrame:CGRectMake(0, 0, frameSize.width, monthNameHeight)];
    
    CGRect frame = CGRectMake(0, 0, itemWidth, itemHeight);
    NSArray *labels = self.contentView.layer.sublayers;
    int i = 1;
    for (int week = 0; week <= 5; week++) {
        for (int day = 0; day <= 6; day++) {
            
            if (i >= labels.count || i > _numberOfDays) {
                return;
            }
            
            if (week == 0 && _startWeekDay > day) {
                continue;
            }
            
            CATextLayer *label = labels[i];
            frame.origin = CGPointMake(day * itemWidth, week * itemHeight + monthNameHeight);
            [label setFrame:frame];
            i++;
        }
    }
    
}

@end

#if !TARGET_OS_TV

@implementation CalendarPickerController

+ (instancetype)defaultPicker
{
    static CalendarPickerController *defaultPicker;
    static dispatch_once_t onceToken;
    
    dispatch_once(&onceToken, ^{
        defaultPicker = [[super alloc]initWithRootViewController:[YearViewController defaultController]];
        defaultPicker.monthNames = @[@"JAN", @"FEB", @"MAR", @"APR", @"MAY", @"JUN", @"JUL", @"AUG", @"SEP", @"OCT", @"NOV", @"DEC"];
        defaultPicker.dayNumberStrings = @[@"1", @"2", @"3", @"4", @"5", @"6", @"7", @"8", @"9", @"10",
                                           @"11", @"12", @"13", @"14", @"15", @"16", @"17", @"18", @"19", @"20",
                                           @"21", @"22", @"23", @"24", @"25", @"26", @"27", @"28", @"29", @"30", @"31"];
        
        defaultPicker.startDayIsSunday = false;
    });
    
    return defaultPicker;
}

+ (instancetype)initWithStartYear:(NSInteger)calendarStartYear endYear:(NSInteger)calendarEndYear withStartDayIsSunday:(BOOL)startDayIsSunday
{
    CalendarPickerController *picker;
    
    
    picker = [[super alloc]initWithRootViewController:[YearViewController initWithStartYear:calendarStartYear endYear:calendarEndYear withStartDayIsSunday:startDayIsSunday]];
    picker.monthNames = @[@"JAN", @"FEB", @"MAR", @"APR", @"MAY", @"JUN", @"JUL", @"AUG", @"SEP", @"OCT", @"NOV", @"DEC"];
    picker.dayNumberStrings = @[@"1", @"2", @"3", @"4", @"5", @"6", @"7", @"8", @"9", @"10",
                                @"11", @"12", @"13", @"14", @"15", @"16", @"17", @"18", @"19", @"20",
                                @"21", @"22", @"23", @"24", @"25", @"26", @"27", @"28", @"29", @"30", @"31"];
    picker.startDayIsSunday = startDayIsSunday;
    
    return picker;
}


- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view.
    
    [self.view setBackgroundColor:[UIColor whiteColor]];
    
    [self setupToolbar];
    [self.navigationBar setTranslucent:true];
    [self setAutomaticallyAdjustsScrollViewInsets:false];
    [self.navigationBar setTintColor:[UIColor colorWithRed:1 green:59/255.f blue:49/255.f alpha:1]];
    
    
}

-(UIImageView * _Nullable )findShadowImageUnder:(UIView*)view {
    if ([view isKindOfClass:UIImageView.class] && view.bounds.size.height <= 1) {
        return (UIImageView*) view;
    }
    
    for (UIView *subview in view.subviews) {
        UIImageView *imageView = [self findShadowImageUnder:subview];
        if (imageView != nil) {
            return imageView;
        }
    }
    
    return nil;
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    
    if (self.viewControllers.count > 1) {
        [self popToRootViewControllerAnimated:false];
    }
    
    UIView *shadowImageView = [self findShadowImageUnder:self.navigationBar];
    
    if (shadowImageView) {
        shadowImageView.hidden = true;
    }
}

- (void)setupToolbar {
    [self setToolbarHidden:true];
    
    UIBarButtonItem *flexibleItem = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemFlexibleSpace target:self action:nil];
    UIBarButtonItem *item1, *item2, *item3, *item4, *item5, *item6, *item7;
    if (!self.startDayIsSunday) {
        item1 = [[UIBarButtonItem alloc] initWithTitle:@"M" style:UIBarButtonItemStylePlain target:nil action:nil];
        item2 = [[UIBarButtonItem alloc] initWithTitle:@"T" style:UIBarButtonItemStylePlain target:nil action:nil];
        item3 = [[UIBarButtonItem alloc] initWithTitle:@"W" style:UIBarButtonItemStylePlain target:nil action:nil];
        item4 = [[UIBarButtonItem alloc] initWithTitle:@"T" style:UIBarButtonItemStylePlain target:nil action:nil];
        item5 = [[UIBarButtonItem alloc] initWithTitle:@"F" style:UIBarButtonItemStylePlain target:nil action:nil];
        item6 = [[UIBarButtonItem alloc] initWithTitle:@"S" style:UIBarButtonItemStylePlain target:nil action:nil];
        item7 = [[UIBarButtonItem alloc] initWithTitle:@"S" style:UIBarButtonItemStylePlain target:nil action:nil];
    } else {
        item1 = [[UIBarButtonItem alloc] initWithTitle:@"S" style:UIBarButtonItemStylePlain target:nil action:nil];
        item2 = [[UIBarButtonItem alloc] initWithTitle:@"M" style:UIBarButtonItemStylePlain target:nil action:nil];
        item3 = [[UIBarButtonItem alloc] initWithTitle:@"T" style:UIBarButtonItemStylePlain target:nil action:nil];
        item4 = [[UIBarButtonItem alloc] initWithTitle:@"W" style:UIBarButtonItemStylePlain target:nil action:nil];
        item5 = [[UIBarButtonItem alloc] initWithTitle:@"T" style:UIBarButtonItemStylePlain target:nil action:nil];
        item6 = [[UIBarButtonItem alloc] initWithTitle:@"F" style:UIBarButtonItemStylePlain target:nil action:nil];
        item7 = [[UIBarButtonItem alloc] initWithTitle:@"S" style:UIBarButtonItemStylePlain target:nil action:nil];
    }
    
    
    item1.tintColor = UIColor.blackColor;
    item2.tintColor = UIColor.blackColor;
    item3.tintColor = UIColor.blackColor;
    item4.tintColor = UIColor.blackColor;
    item5.tintColor = UIColor.blackColor;
    item6.tintColor = UIColor.blackColor;
    item7.tintColor = UIColor.blackColor;
    
    UIFont *font = [UIFont systemFontOfSize:10];
    NSDictionary *attributes = @{NSFontAttributeName: font};
    
    [item1 setTitleTextAttributes:attributes forState:UIControlStateNormal];
    [item2 setTitleTextAttributes:attributes forState:UIControlStateNormal];
    [item3 setTitleTextAttributes:attributes forState:UIControlStateNormal];
    [item4 setTitleTextAttributes:attributes forState:UIControlStateNormal];
    [item5 setTitleTextAttributes:attributes forState:UIControlStateNormal];
    [item6 setTitleTextAttributes:attributes forState:UIControlStateNormal];
    [item7 setTitleTextAttributes:attributes forState:UIControlStateNormal];
    
    NSArray *items = [NSArray arrayWithObjects:item1, flexibleItem, item2, flexibleItem, item3, flexibleItem, item4, flexibleItem, item5, flexibleItem, item6, flexibleItem, item7, nil];
    
    
    _topToolbar = [[UIToolbar alloc]initWithFrame:CGRectMake(0, 0, self.view.frame.size.width, 22)];
    [_topToolbar setItems:items];
    [_topToolbar setTranslatesAutoresizingMaskIntoConstraints:false];
    [self.view addSubview:_topToolbar];
    [_topToolbar.topAnchor constraintEqualToAnchor:self.navigationBar.bottomAnchor constant:-1].active = true;
    [_topToolbar.leftAnchor constraintEqualToAnchor:self.navigationBar.leftAnchor].active = true;
    [_topToolbar.widthAnchor constraintEqualToAnchor:self.view.widthAnchor].active = true;
    [_topToolbar.heightAnchor constraintEqualToConstant:22].active = true;
    [_topToolbar setClipsToBounds:true];
    _topToolbar.layer.borderWidth = 0;
    _topToolbar.layer.borderColor = [[UIColor clearColor] CGColor];
}

@end

@implementation MonthViewController


+ (instancetype)defaultControllerWithYear:(NSInteger)year andMonth:(NSInteger)month withStartDayIsSunday:(BOOL)startDayIsSunday{
    MonthViewController *defaultController;
    UICollectionViewFlowLayout *collectionViewLayout;
    collectionViewLayout = [UICollectionViewFlowLayout new];
    [collectionViewLayout setScrollDirection:UICollectionViewScrollDirectionVertical];
    
    defaultController = [[super alloc] initWithCollectionViewLayout:collectionViewLayout];
    defaultController.year = year;
    defaultController.currentMonth = month;
    defaultController.startDayIsSunday = false;
    defaultController.cellDaysDataByIndexPath = [NSMutableDictionary new];
    
    defaultController.monthNames = [CalendarPickerController defaultPicker].monthNames;
    defaultController.dayNumberStrings = [CalendarPickerController defaultPicker].dayNumberStrings;
    defaultController.startDayIsSunday = startDayIsSunday;
    
    return defaultController;
}

static NSString * const startWeekDayKey = @"startWeekDay";
static NSString * const numberOfDaysKey = @"numberOfDays";
static NSString * const reuseIdentifier = @"DayInYearViewCell";
static NSString * const headerReuseIdentifier = @"MonthSectionHeaderReusableView";

- (void)viewDidLoad {
    [super viewDidLoad];
    if (!_startDayIsSunday) {
        _holidays = @[@5, @6, @12, @13, @19, @20, @26, @27, @33, @34];
    } else {
        _holidays = @[@0, @6, @7, @13, @14, @20, @21, @27, @28, @34, @35];
    }
    [self.collectionView setContentInset:UIEdgeInsetsMake(self.topLayoutGuide.length, 0, 0, 0)];
    
    [self.collectionView registerClass:[DayInYearViewCell class] forCellWithReuseIdentifier:reuseIdentifier];
    [self.collectionView registerClass:[MonthSectionHeaderReusableView class] forSupplementaryViewOfKind:UICollectionElementKindSectionHeader withReuseIdentifier:headerReuseIdentifier];
    
    self.collectionView.opaque = true;
    self.collectionView.backgroundColor = [UIColor whiteColor];
    self.collectionView.showsVerticalScrollIndicator = false;
    
    UICollectionViewFlowLayout *layout = (UICollectionViewFlowLayout *)self.collectionViewLayout;
    [layout setSectionInset:UIEdgeInsetsMake(10, 0, 10, 0)];
    
    self.itemSize = [self itemSizeForSize:self.collectionView.bounds.size];
    
    NSIndexPath *currentMonthIndexPath = [NSIndexPath indexPathForItem:15 inSection:_currentMonth - 1];
    [self.collectionView scrollToItemAtIndexPath:currentMonthIndexPath atScrollPosition:UICollectionViewScrollPositionCenteredVertically animated:false];
    
}

- (CGSize)itemSizeForSize:(CGSize)size {
    CGFloat itemSide = (size.width) / 7.01;
    if (size.width < size.height) {
        return CGSizeMake(itemSide, itemSide);
    }
    return CGSizeMake(itemSide, itemSide / 2);
}

- (BOOL)shouldInvalidateLayoutForBoundsChange:(CGRect)newBounds {
    return YES;
}

- (void)viewWillTransitionToSize:(CGSize)size withTransitionCoordinator:(id<UIViewControllerTransitionCoordinator>)coordinator {
    [super viewWillTransitionToSize:size
          withTransitionCoordinator:coordinator];
    
    [self.collectionView setContentInset:UIEdgeInsetsMake(self.topLayoutGuide.length, 0, 0, 0)];
    
    self.itemSize = [self itemSizeForSize:size];
    
    [coordinator animateAlongsideTransition:^(id<UIViewControllerTransitionCoordinatorContext> context) {
        [self.collectionView.collectionViewLayout invalidateLayout];
    } completion:^(id<UIViewControllerTransitionCoordinatorContext> context) { }];
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    
    [self.view layoutIfNeeded];
    
    NSIndexPath *currentMonthIndexPath = [NSIndexPath indexPathForItem:15 inSection:_currentMonth - 1];
    [self.collectionView scrollToItemAtIndexPath:currentMonthIndexPath atScrollPosition:UICollectionViewScrollPositionCenteredVertically animated:false];
    
    ((CalendarPickerController*) self.navigationController).topToolbar.hidden = false;
}

- (void)didReceiveMemoryWarning {
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

#pragma mark <UICollectionViewDataSource>

- (NSInteger)numberOfSectionsInCollectionView:(UICollectionView *)collectionView {
    static NSDateFormatter *dateFormat;
    static dispatch_once_t onceToken;
    static NSString * const stringDateFormat = @"yyyy-MM-dd";
    static NSString * const dateStrFormat = @"%ld-%d-01";
    
    dispatch_once(&onceToken, ^{
        dateFormat = [[NSDateFormatter alloc] init];
        [dateFormat setDateFormat:stringDateFormat];
        [dateFormat setTimeZone:[NSTimeZone timeZoneWithAbbreviation:@"GMT"]];
    });
    
    for (int i = 0; i < 12; i++) {
        NSString *dateStr = [NSString stringWithFormat:dateStrFormat, (long)_year, i + 1];
        NSDate *currentCellDate = [dateFormat dateFromString:dateStr];
        NSRange range = [_calendar rangeOfUnit:NSCalendarUnitDay inUnit:NSCalendarUnitMonth forDate:currentCellDate];
        NSDateComponents *comps = [_calendar components:NSCalendarUnitWeekday fromDate:currentCellDate];
        
        
        int startWeekDay = (int) [comps weekday] - 1;
        
        if (!self.startDayIsSunday) { // TODO: setting start of week day for calendar
            startWeekDay -= 1;
            if (startWeekDay < 0) {
                startWeekDay = 6;
            }
        }
        
        NSDictionary *cellData = @{numberOfDaysKey : [NSNumber numberWithUnsignedInteger:range.length], startWeekDayKey : [NSNumber numberWithInt:startWeekDay]};
        [_cellDaysDataByIndexPath setValue:cellData forKey:[NSString stringWithFormat:@"%d", i]];
        
    }
    return 12;
}


- (NSInteger)collectionView:(UICollectionView *)collectionView numberOfItemsInSection:(NSInteger)section {
    
    NSDictionary *cellData = _cellDaysDataByIndexPath[[NSString stringWithFormat:@"%lu", (unsigned long)section]];
    if (cellData != nil) {
        int startWeekDay = (int) [[cellData valueForKey:startWeekDayKey] integerValue];
        int numberOfDays = (int) [[cellData valueForKey:numberOfDaysKey] integerValue];
        return startWeekDay + numberOfDays;
    }
    return 37;
}

- (UICollectionViewCell *)collectionView:(UICollectionView *)collectionView cellForItemAtIndexPath:(NSIndexPath *)indexPath {
    DayInYearViewCell *cell = [collectionView dequeueReusableCellWithReuseIdentifier:reuseIdentifier forIndexPath:indexPath];
    // Configure the cell
    
    NSDictionary *cellData = _cellDaysDataByIndexPath[[NSString stringWithFormat:@"%lu", (unsigned long)indexPath.section]];
    
    
    if (cellData) {
        int startWeekDay = (int)[[cellData valueForKey:startWeekDayKey] integerValue];
        int numberOfDays = (int)[[cellData valueForKey:numberOfDaysKey] integerValue];
        
        int number = (int)indexPath.item - startWeekDay + 1;
        
        if (number >= 1 && number <= numberOfDays) {
            cell.dayNumber.string = [NSString stringWithFormat:@"%d", number];
            NSNumber *position;
            
            position = [NSNumber numberWithInteger:startWeekDay + number];
            if ([_holidays containsObject:position]) {
                cell.dayNumber.foregroundColor = UIColor.lightGrayColor.CGColor;
            } else {
                cell.dayNumber.foregroundColor = UIColor.blackColor.CGColor;
            }
            cell.topLine.hidden = false;
        } else {
            cell.topLine.hidden = true;
        }
    }
    return cell;
}



-(UICollectionReusableView *)collectionView:(UICollectionView *)collectionView viewForSupplementaryElementOfKind:(nonnull NSString *)kind atIndexPath:(nonnull NSIndexPath *)indexPath {
    
    MonthSectionHeaderReusableView *header;
    
    if (kind == UICollectionElementKindSectionHeader) {
        
        header = [collectionView dequeueReusableSupplementaryViewOfKind:kind
                                                    withReuseIdentifier:headerReuseIdentifier
                                                           forIndexPath:indexPath];
        
        NSDictionary *cellData = _cellDaysDataByIndexPath[[NSString stringWithFormat:@"%lu", (unsigned long)indexPath.section]];
        
        if (cellData != nil) {
            CGFloat width = self.itemSize.width;
            int startWeekDay = (int) [[cellData valueForKey:startWeekDayKey] integerValue];
            header.offset = startWeekDay * width;
            header.width = width;
        }
        
        
        header.monthTitle.string = [NSString stringWithFormat:@"%@", _monthNames[indexPath.section]];
        
    }
    
    
    return header;
}

- (CGSize)collectionView:(UICollectionView *)collectionView layout:(nonnull UICollectionViewLayout *)collectionViewLayout referenceSizeForHeaderInSection:(NSInteger)section {
    return CGSizeMake(self.view.bounds.size.width, 44);
    
}

- (CGSize)collectionView:(UICollectionView *)collectionView layout:(UICollectionViewLayout *)collectionViewLayout
  sizeForItemAtIndexPath:(NSIndexPath *)atIndexPath {
    return self.itemSize;
}

- (CGFloat)collectionView:(UICollectionView *)collectionView layout:(UICollectionViewLayout*)collectionViewLayout minimumInteritemSpacingForSectionAtIndex:(NSInteger)section
{
    return 0;
}

#pragma mark <UICollectionViewDelegate>

- (void)collectionView:(UICollectionView *)collectionView didSelectItemAtIndexPath:(NSIndexPath *)indexPath {
    DayInYearViewCell *cell = (DayInYearViewCell *)[collectionView cellForItemAtIndexPath:indexPath];
    
    CATextLayer *label = cell.dayNumber;
    label.cornerRadius = label.bounds.size.width / 2;
    [label setForegroundColor:[UIColor whiteColor].CGColor];
    
    
    [cell.dayNumber setBackgroundColor:[UIColor redColor].CGColor];
    
    NSString *dateStr = [NSString stringWithFormat:@"%d-%d-%@", (int)_year, indexPath.section + 1, label.string];
    
    ISN_SendCallbackToUnity(OnDatePickedCallback, dateStr);
    
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.2 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        [self.navigationController dismissViewControllerAnimated:true completion:nil];
    });
    
    
}

@end

@implementation YearViewController

+ (instancetype) initWithStartYear:(NSInteger)calendarStartYear endYear:(NSInteger)calendarEndYear withStartDayIsSunday:(BOOL)startDayIsSunday{
    UICollectionViewFlowLayout *collectionViewLayout;
    
    collectionViewLayout = [UICollectionViewFlowLayout new];
    [collectionViewLayout setScrollDirection:UICollectionViewScrollDirectionVertical];
    
    YearViewController *ctrl = [[YearViewController alloc]initWithCollectionViewLayout:collectionViewLayout];
    ctrl.startYear = calendarStartYear;
    ctrl.endYear = calendarEndYear;
    ctrl.currentDate = [NSDate date];
    ctrl.calendar = [[NSCalendar alloc]initWithCalendarIdentifier:NSCalendarIdentifierGregorian];
    NSDateComponents *currentDateComponents = [[NSCalendar currentCalendar] components:NSCalendarUnitYear fromDate:ctrl.currentDate];
    ctrl.currentYear = [currentDateComponents year];
    ctrl.startDayIsSunday = startDayIsSunday;
    
    return ctrl;
}

+ (instancetype)defaultController
{
    YearViewController *defaultController;
    defaultController = [self initWithStartYear:1989 endYear:2089 withStartDayIsSunday:true];
    
    return defaultController;
}

static NSString * const DayInYearViewCellKey = @"DayInYearViewCell";
static NSString * const MonthInYearViewCellKey = @"MonthInYearViewCell";
static NSString * const MonthInYearViewCellKey0 = @"MonthInYearViewCell0";
static NSString * const MonthInYearViewCellKey1 = @"MonthInYearViewCell1";
static NSString * const MonthInYearViewCellKey2 = @"MonthInYearViewCell2";
static NSString * const MonthInYearViewCellKey3 = @"MonthInYearViewCell3";
static NSString * const MonthInYearViewCellKey4 = @"MonthInYearViewCell4";
static NSString * const MonthInYearViewCellKey5 = @"MonthInYearViewCell5";
static NSString * const MonthInYearViewCellKey6 = @"MonthInYearViewCell6";

- (void)viewDidLoad {
    [super viewDidLoad];
    _cellDaysDataByIndexPath = [NSMutableDictionary new];
    
    _monthNames = [CalendarPickerController defaultPicker].monthNames;
    _dayNumberStrings = [CalendarPickerController defaultPicker].dayNumberStrings;
    
    // Register cell classes
    [self.collectionView registerClass:[MonthLayerCollectionViewCell class] forCellWithReuseIdentifier:MonthInYearViewCellKey0];
    [self.collectionView registerClass:[MonthLayerCollectionViewCell class] forCellWithReuseIdentifier:MonthInYearViewCellKey1];
    [self.collectionView registerClass:[MonthLayerCollectionViewCell class] forCellWithReuseIdentifier:MonthInYearViewCellKey2];
    [self.collectionView registerClass:[MonthLayerCollectionViewCell class] forCellWithReuseIdentifier:MonthInYearViewCellKey3];
    [self.collectionView registerClass:[MonthLayerCollectionViewCell class] forCellWithReuseIdentifier:MonthInYearViewCellKey4];
    [self.collectionView registerClass:[MonthLayerCollectionViewCell class] forCellWithReuseIdentifier:MonthInYearViewCellKey5];
    [self.collectionView registerClass:[MonthLayerCollectionViewCell class] forCellWithReuseIdentifier:MonthInYearViewCellKey6];
    
    [self.collectionView registerClass:[YearSectionHeaderReusableView class]forSupplementaryViewOfKind:UICollectionElementKindSectionHeader withReuseIdentifier:headerReuseIdentifier];
    
    self.collectionView.opaque = true;
    self.collectionView.backgroundColor = [UIColor whiteColor];
    self.collectionView.showsVerticalScrollIndicator = false;
    
    self.itemSize = [self itemSizeForBounds:self.collectionView.bounds.size];
    [self setBarButtonItems];
    
    self.navigationController.delegate = self;
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    [self.navigationItem setTitle:nil];
    
    NSInteger currentYearSection = _currentYear - _startYear;
    ((CalendarPickerController*) self.navigationController).topToolbar.hidden = true;
    [self.collectionView scrollToItemAtIndexPath:[NSIndexPath indexPathForItem:5 inSection:currentYearSection] atScrollPosition:UICollectionViewScrollPositionCenteredVertically animated:false];
}

- (CGSize)itemSizeForBounds:(CGSize)bounds {
    
    int numberOfColumns;
    if (bounds.width > bounds.height) {
        numberOfColumns = 6;
    } else {
        numberOfColumns = 3;
    }
    
    CGFloat minimumInteritemSpacing = ((UICollectionViewFlowLayout *) self.collectionView.collectionViewLayout).minimumInteritemSpacing;
    CGFloat itemSide = ceil((bounds.width - 40) / numberOfColumns - minimumInteritemSpacing);
    return CGSizeMake(itemSide, itemSide + numberOfColumns * 8);
}

- (BOOL)shouldInvalidateLayoutForBoundsChange:(CGRect)newBounds {
    return YES;
}

- (void)viewWillTransitionToSize:(CGSize)size withTransitionCoordinator:(id<UIViewControllerTransitionCoordinator>)coordinator {
    [super viewWillTransitionToSize:size
          withTransitionCoordinator:coordinator];
    
    self.itemSize = [self itemSizeForBounds:size];
    
    [coordinator animateAlongsideTransition:^(id<UIViewControllerTransitionCoordinatorContext> context) {
        [self.collectionView.collectionViewLayout invalidateLayout];
    } completion:^(id<UIViewControllerTransitionCoordinatorContext> context) { }];
}

- (void)setBarButtonItems {
    UIBarButtonItem *leftBarButtonItem = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemCancel target:self action:@selector(cancel:)];
    
    self.navigationItem.leftBarButtonItem = leftBarButtonItem;
}

- (void)cancel:(UIBarButtonItem*)sender {
    [[self presentingViewController]dismissViewControllerAnimated:true completion:nil];
}

#pragma mark <UICollectionViewDataSource>

- (NSInteger)numberOfSectionsInCollectionView:(UICollectionView *)collectionView {
    NSInteger numberOfSections = _endYear - _startYear + 1;
    
    static NSDateFormatter *dateFormat;
    static NSDate *referenceDate;
    static dispatch_once_t onceToken;
    static NSString * const stringDateFormat = @"yyyy-MM-dd";
    static NSString * const dateStrFormat = @"%d-%d-01";
    
    dispatch_once(&onceToken, ^{
        referenceDate = [NSDate dateWithTimeIntervalSinceReferenceDate:0];
        dateFormat = [[NSDateFormatter alloc] init];
        [dateFormat setDateFormat:stringDateFormat];
        [dateFormat setTimeZone:[NSTimeZone timeZoneWithAbbreviation:@"GMT"]];
    });
    for (NSInteger section = 0; section < numberOfSections; section++) {
        for (int i = 0; i < 12; i++) {
            NSInteger currentCellYear = _startYear + section;
            NSString *dateStr = [NSString stringWithFormat:dateStrFormat, (int) currentCellYear, i + 1];
            NSDate *currentCellDate = [dateFormat dateFromString:dateStr];
            NSRange range = [_calendar rangeOfUnit:NSCalendarUnitDay inUnit:NSCalendarUnitMonth forDate:currentCellDate];
            NSDateComponents *comps = [_calendar components:NSCalendarUnitWeekday fromDate:currentCellDate];
            
            int startWeekDay = (int) [comps weekday] - 1;
            if (!self.startDayIsSunday) { // TODO: setting start of week day for calendar
                startWeekDay -= 1;
                if (startWeekDay < 0) {
                    startWeekDay = 6;
                }
            }
            //
            NSArray *cellData = @[[NSNumber numberWithUnsignedInteger:range.length] , [NSNumber numberWithInt:startWeekDay]];
            [_cellDaysDataByIndexPath setValue:cellData forKey:[NSString stringWithFormat:@"%lu-%lu", (unsigned long)i, (unsigned long)section]];
            
        }
    }
    
    
    return numberOfSections;
}


- (NSInteger)collectionView:(UICollectionView *)collectionView numberOfItemsInSection:(NSInteger)section {
    return 12;
    
}

- (UICollectionViewCell *)collectionView:(UICollectionView *)collectionView cellForItemAtIndexPath:(NSIndexPath *)indexPath {
    NSArray *cellData = _cellDaysDataByIndexPath[[NSString stringWithFormat:@"%lu-%lu", (unsigned long)indexPath.item, (unsigned long)indexPath.section]];
    int startWeekDay = (int) [[cellData objectAtIndex:1] integerValue];
    int numberOfDays = (int) [[cellData objectAtIndex:0] integerValue];
    NSString *identifier = [MonthInYearViewCellKey stringByAppendingFormat:@"%d", startWeekDay];
    
    MonthLayerCollectionViewCell *cell = [collectionView dequeueReusableCellWithReuseIdentifier:identifier forIndexPath:indexPath];
    [cell setStartDay:startWeekDay];
    [cell defineNumberOfDays:numberOfDays];
    cell.monthTitle.string = _monthNames[indexPath.item];
    
    return cell;
    
    
}

- (UIEdgeInsets)collectionView:(UICollectionView *)collectionView layout:(nonnull UICollectionViewLayout *)collectionViewLayout insetForSectionAtIndex:(NSInteger)section {
    static UIEdgeInsets insets;
    static dispatch_once_t onceToken;
    
    dispatch_once(&onceToken, ^{
        CGFloat minimumLineSpacing = [(UICollectionViewFlowLayout *)collectionViewLayout minimumLineSpacing];
        insets = UIEdgeInsetsMake(minimumLineSpacing, 20, minimumLineSpacing, 20);
    });
    return insets;
    
}

-(UICollectionReusableView *)collectionView:(UICollectionView *)collectionView viewForSupplementaryElementOfKind:(nonnull NSString *)kind atIndexPath:(nonnull NSIndexPath *)indexPath {
    
    YearSectionHeaderReusableView *header;
    
    if (kind == UICollectionElementKindSectionHeader) {
        
        header = [collectionView dequeueReusableSupplementaryViewOfKind:kind
                                                    withReuseIdentifier:headerReuseIdentifier
                                                           forIndexPath:indexPath];
        
        NSInteger currentSectionYear = _startYear + indexPath.section;
        header.yearTitle.string = [NSString stringWithFormat:@"%ld", (long) currentSectionYear];
    }
    
    
    return header;
}

-(CGSize)collectionView:(UICollectionView *)collectionView layout:(nonnull UICollectionViewLayout *)collectionViewLayout referenceSizeForHeaderInSection:(NSInteger)section {
    static CGSize headerSize;
    static dispatch_once_t onceToken;
    
    dispatch_once(&onceToken, ^{
        headerSize = CGSizeMake(ceil(self.view.frame.size.width), 44);
    });
    
    return headerSize;
    
}

- (CGSize)collectionView:(UICollectionView *)collectionView layout:(UICollectionViewLayout *)collectionViewLayout
  sizeForItemAtIndexPath:(NSIndexPath *)atIndexPath {
    return _itemSize;
}

#pragma mark <UICollectionViewDelegate>

- (void)collectionView:(UICollectionView *)collectionView didSelectItemAtIndexPath:(NSIndexPath *)indexPath {
    
    NSInteger currentSectionYear = _startYear + indexPath.section;
    [self.navigationItem setTitle:[NSString stringWithFormat:@"%d", (int) currentSectionYear]];
    
    self.viewForZooming = [collectionView cellForItemAtIndexPath:indexPath];
    
    MonthViewController *monthViewController = [MonthViewController defaultControllerWithYear:currentSectionYear andMonth:indexPath.item + 1 withStartDayIsSunday:self.startDayIsSunday];
    monthViewController.calendar = self.calendar;
    [monthViewController.collectionView scrollToItemAtIndexPath:[NSIndexPath indexPathForItem:0 inSection:2] atScrollPosition:UICollectionViewScrollPositionBottom animated:false];
    
    
    
    [self.navigationController pushViewController:monthViewController animated:true];
}

- (id <UIViewControllerAnimatedTransitioning>)navigationController:(UINavigationController *)navigationController
                                   animationControllerForOperation:(UINavigationControllerOperation)operation
                                                fromViewController:(UIViewController *)fromVC
                                                  toViewController:(UIViewController *)toVC {
    
    // Determine if we're presenting or dismissing
    ZOTransitionType type = (fromVC == self) ? ZOTransitionTypePresenting : ZOTransitionTypeDismissing;
    
    // Create a transition instance with the selected cell's imageView as the target view
    ZOZolaZoomTransition *zoomTransition = [ZOZolaZoomTransition transitionFromView:self.viewForZooming
                                                                               type:type
                                                                           duration:0.3
                                                                           delegate:self];
    
    return zoomTransition;
}

- (CGRect)zolaZoomTransition:(ZOZolaZoomTransition *)zoomTransition
        startingFrameForView:(UIView *)targetView
              relativeToView:(UIView *)relativeView
          fromViewController:(UIViewController *)fromViewController
            toViewController:(UIViewController *)toViewController {
    
    if (fromViewController == self) {
        // We're pushing to the detail controller
        CGRect newFrame = [self.viewForZooming convertRect:self.viewForZooming.bounds toView:relativeView];
        return newFrame;
    } else if ([fromViewController isKindOfClass:[MonthViewController class]]) {
        // We're popping back to this master controller
        MonthViewController *detailController = (MonthViewController *)fromViewController;
        CGRect newFrame = [detailController.view convertRect:detailController.view.bounds toView:relativeView];
        return newFrame;
    }
    
    return CGRectZero;
}

- (CGRect)zolaZoomTransition:(ZOZolaZoomTransition *)zoomTransition
       finishingFrameForView:(UIView *)targetView
              relativeToView:(UIView *)relativeView
          fromViewController:(UIViewController *)fromViewComtroller
            toViewController:(UIViewController *)toViewController {
    
    if (fromViewComtroller == self) {
        // We're pushing to the detail controller
        MonthViewController *detailController = (MonthViewController *)toViewController;
        
        CGFloat targetWidth =  detailController.view.bounds.size.width;
        CGFloat targetHeight = (targetWidth / self.viewForZooming.bounds.size.width) * self.viewForZooming.bounds.size.height;
        CGFloat targetY = (detailController.view.bounds.size.height - targetHeight) / 2;
        
        CGRect newFrame = CGRectMake(0, targetY, targetWidth, targetHeight);// = [detailController.view convertRect:detailController.view.bounds toView:relativeView];
        return newFrame;
    } else if ([fromViewComtroller isKindOfClass:[MonthViewController class]]) {
        // We're popping back to this master controller.
        CGRect newFrame = [self.viewForZooming convertRect:self.viewForZooming.bounds toView:relativeView];
        return newFrame;
    }
    
    return CGRectZero;
}

@end

@implementation YearSectionHeaderReusableView
- (instancetype)initWithFrame:(CGRect)frame {
    self = [super initWithFrame:frame];
    if (self) {
        [self setOpaque:true];
        [self setBackgroundColor:[UIColor whiteColor]];
        
        _yearTitle = [[CATextLayer alloc] init];
        
        CGFontRef cgFont = CGFontCreateWithFontName((CFStringRef)[UIFont systemFontOfSize:22 weight:UIFontWeightThin].fontName);
        [_yearTitle setFont:cgFont];
        
        [_yearTitle setFontSize:29];
        [_yearTitle setAlignmentMode:kCAAlignmentLeft];
        [_yearTitle setForegroundColor:[[UIColor blackColor] CGColor]];
        _yearTitle.contentsScale = [UIScreen mainScreen].scale;
        
        [self.layer addSublayer:_yearTitle];
        _bottomLine = [[CALayer alloc]init];
        [_bottomLine setBackgroundColor:[[UIColor groupTableViewBackgroundColor] CGColor]];
        [self.layer addSublayer:_bottomLine];
        
    }
    return self;
}

- (void)layoutSubviews {
    CGSize size = self.bounds.size;
    _yearTitle.frame = CGRectMake(20, 7, size.width - 40, size.height - 10);
    _bottomLine.frame = CGRectMake(20, size.height - 1, size.width - 40, 1);
}

@end

@implementation DayInYearViewCell

- (instancetype)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:frame];
    if (self) {
        self.opaque = true;
        self.contentView.opaque = true;
        self.autoresizesSubviews = false;
        self.contentView.translatesAutoresizingMaskIntoConstraints = false;
        self.contentView.clearsContextBeforeDrawing = false;
        
        self.topLine = [[CALayer alloc]init];
        [self.contentView.layer addSublayer:self.topLine];
        
        [self.topLine setBackgroundColor:[[UIColor groupTableViewBackgroundColor] CGColor]];
        
        self.dayNumber = [[LCTextLayer alloc] init];
        [self.contentView.layer addSublayer:self.dayNumber];
        CGFontRef cgFont = CGFontCreateWithFontName((CFStringRef)[UIFont systemFontOfSize:17 weight:UIFontWeightRegular].fontName);
        [self.dayNumber setFont:cgFont];
        [self.dayNumber setFontSize:17];
        [self.dayNumber setAlignmentMode:kCAAlignmentCenter];
        
        [self.dayNumber setForegroundColor:[[UIColor blackColor] CGColor]];
        self.dayNumber.contentsScale = [UIScreen mainScreen].scale;
    }
    return self;
}

- (void)layoutSubviews {
    CGSize size = self.bounds.size;
    
    [self.dayNumber setFrame:CGRectMake(size.width / 4, size.height / 3, size.width / 2, size.height / 2)];
    self.topLine.frame = CGRectMake(0, 0, size.width, 1);
}

- (void)prepareForReuse {
    self.dayNumber.string = nil;
    [self.contentView setBackgroundColor:[UIColor whiteColor]];
}

@end

@implementation MonthSectionHeaderReusableView


- (id)initWithFrame:(CGRect)aRect {
    self = [super initWithFrame:(CGRect)aRect];
    if (self) {
        self.opaque = true;
        self.autoresizesSubviews = false;
        self.translatesAutoresizingMaskIntoConstraints = false;
        self.clearsContextBeforeDrawing = false;
        
        self.monthTitle = [[CATextLayer alloc] init];
        //        [self.monthTitle setFont:@"Helvetica-Light"];
        [self.monthTitle setFontSize:17];
        [self.monthTitle setAlignmentMode:kCAAlignmentCenter];
        [self.monthTitle setForegroundColor:[[UIColor redColor] CGColor]];
        [self.monthTitle setBackgroundColor:[[UIColor whiteColor] CGColor]];
        self.monthTitle.contentsScale = [UIScreen mainScreen].scale;
        [self.layer addSublayer:self.monthTitle];
    }
    return self;
}

- (void)layoutSubviews {
    CGSize size = self.bounds.size;
    _monthTitle.frame = CGRectMake(_offset, 20,  _width, size.height - 20);
}

@end

@implementation ZOZolaZoomTransition

#pragma mark - Constructors

- (instancetype)initWithTargetView:(UIView *)targetView
                              type:(ZOTransitionType)type
                          duration:(NSTimeInterval)duration
                          delegate:(id<ZOZolaZoomTransitionDelegate>)delegate {
    
    self = [super init];
    if (self) {
        self.targetView = targetView;
        self.type = type;
        self.duration = duration;
        self.delegate = delegate;
        self.fadeColor = [UIColor whiteColor];
    }
    return self;
}

+ (instancetype)transitionFromView:(UIView *)targetView
                              type:(ZOTransitionType)type
                          duration:(NSTimeInterval)duration
                          delegate:(id<ZOZolaZoomTransitionDelegate>)delegate {
    
    return [[[self class] alloc] initWithTargetView:targetView
                                               type:type
                                           duration:duration
                                           delegate:delegate];
}

- (instancetype)init NS_UNAVAILABLE {
    return nil;
}

#pragma mark - UIViewControllerAnimatedTransitioning Methods

- (void)animateTransition:(id <UIViewControllerContextTransitioning>)transitionContext {
    
#if !defined(ZO_APP_EXTENSIONS)
    [[UIApplication sharedApplication] beginIgnoringInteractionEvents];
#endif
    
    UIView *containerView = [transitionContext containerView];
    UIViewController *fromViewController = [transitionContext viewControllerForKey:UITransitionContextFromViewControllerKey];
    UIViewController *toViewController = [transitionContext viewControllerForKey:UITransitionContextToViewControllerKey];
    
    // iOS7 and iOS8+ have different ways of obtaining the view from the view controller.
    // Here we're taking care of that inconsistency upfront, so we don't have to deal with
    // it later.
    UIView *fromControllerView = nil;
    UIView *toControllerView = nil;
    if ([transitionContext respondsToSelector:@selector(viewForKey:)]) {
        // iOS8+
        fromControllerView = [transitionContext viewForKey:UITransitionContextFromViewKey];
        toControllerView = [transitionContext viewForKey:UITransitionContextToViewKey];
    } else {
        // iOS7
        fromControllerView = fromViewController.view;
        toControllerView = toViewController.view;
    }
    
    // Setup a background view to prevent content from peeking through while our
    // animation is in progress
    UIView *backgroundView = [[UIView alloc] initWithFrame:containerView.bounds];
    backgroundView.backgroundColor = _fadeColor;
    //    [containerView addSubview:backgroundView];
    
    if (_type == ZOTransitionTypePresenting) {
        // Make sure the "to view" has been laid out if we're presenting. This needs
        // to be done before we ask the delegate for frames.
        [toControllerView setNeedsLayout];
        [toControllerView layoutIfNeeded];
    }
    
    // Ask the delegate for the target view's starting frame
    CGRect startFrame = [_delegate zolaZoomTransition:self
                                 startingFrameForView:_targetView
                                       relativeToView:fromControllerView
                                   fromViewController:fromViewController
                                     toViewController:toViewController];
    
    // Ask the delegate for the target view's finishing frame
    CGRect finishFrame = [_delegate zolaZoomTransition:self
                                 finishingFrameForView:_targetView
                                        relativeToView:toControllerView
                                    fromViewController:fromViewController
                                      toViewController:toViewController];
    
    if (_type == ZOTransitionTypePresenting) {
        // The "from" snapshot
#if TARGET_IPHONE_SIMULATOR
        UIView *fromControllerSnapshot = [[UIImageView alloc] initWithImage:[fromControllerView zo_snapshot]];
#else
        UIView *fromControllerSnapshot = [fromControllerView snapshotViewAfterScreenUpdates:NO];
#endif
        
        // The fade view will sit between the "from" snapshot and the target snapshot.
        // This is what is used to create the fade effect.
        UIView *fadeView = [[UIView alloc] initWithFrame:containerView.bounds];
        fadeView.backgroundColor = _fadeColor;
        fadeView.alpha = 0.0;
        
        // The star of the show
#if TARGET_IPHONE_SIMULATOR
        UIView *targetSnapshot = [[UIImageView alloc] initWithImage:[_targetView zo_snapshot]];
#else
        UIView *targetSnapshot = [_targetView snapshotViewAfterScreenUpdates:NO];
#endif
        targetSnapshot.frame = startFrame;
        
        // Check if the delegate provides any supplementary views
        NSArray *supplementaryViews = nil;
        if ([_delegate respondsToSelector:@selector(supplementaryViewsForZolaZoomTransition:)]) {
            NSAssert([_delegate respondsToSelector:@selector(zolaZoomTransition:frameForSupplementaryView:relativeToView:)], @"supplementaryViewsForZolaZoomTransition: requires zolaZoomTransition:frameForSupplementaryView:relativeToView: to be implemented by the delegate. Implement zolaZoomTransition:frameForSupplementaryView:relativeToView: and try again.");
            supplementaryViews = [_delegate supplementaryViewsForZolaZoomTransition:self];
        }
        
        // All supplementary snapshots are added to a container, and then the same transform
        // that we're going to apply to the "from" controller snapshot will be applied to the
        // supplementary container
        UIView *supplementaryContainer = [[UIView alloc] initWithFrame:containerView.bounds];
        supplementaryContainer.backgroundColor = [UIColor clearColor];
        for (UIView *supplementaryView in supplementaryViews) {
#if TARGET_IPHONE_SIMULATOR
            UIView *supplementarySnapshot = [[UIImageView alloc] initWithImage:[supplementaryView zo_snapshot]];
#else
            UIView *supplementarySnapshot = [supplementaryView snapshotViewAfterScreenUpdates:YES];
#endif
            
            supplementarySnapshot.frame = [_delegate zolaZoomTransition:self
                                              frameForSupplementaryView:supplementaryView
                                                         relativeToView:fromControllerView];
            
            [supplementaryContainer addSubview:supplementarySnapshot];
        }
        
        // Assemble the hierarchy in the container
        [containerView addSubview:fromControllerSnapshot];
        //        [containerView addSubview:fadeView];
        [containerView addSubview:targetSnapshot];
        [containerView addSubview:supplementaryContainer];
        
        // Determine how much we need to scale
        CGFloat scaleFactor = finishFrame.size.width / startFrame.size.width;
        
        // Calculate the ending origin point for the "from" snapshot taking into account the scale transformation
        CGPoint endPoint = CGPointMake((-startFrame.origin.x * scaleFactor) + finishFrame.origin.x, (-startFrame.origin.y * scaleFactor) + finishFrame.origin.y);
        
        // Animate presentation
        [UIView animateWithDuration:[self transitionDuration:transitionContext]
                              delay:0.0
                            options:UIViewAnimationOptionCurveEaseInOut
                         animations:^{
                             // Transform and move the "from" snapshot
                             fromControllerSnapshot.transform = CGAffineTransformMakeScale(scaleFactor, scaleFactor);
                             if (!isnan(endPoint.x) && !isnan(endPoint.y)) {
                                 fromControllerSnapshot.frame = CGRectMake(endPoint.x, endPoint.y, fromControllerSnapshot.frame.size.width, fromControllerSnapshot.frame.size.height);
                                 
                                 // Transform and move the supplementary container with the "from" snapshot
                                 supplementaryContainer.transform = fromControllerSnapshot.transform;
                                 supplementaryContainer.frame = fromControllerSnapshot.frame;
                                 
                                 // Fade
                                 //                                 fadeView.alpha = 1.0;
                                 supplementaryContainer.alpha = 0.0;
                                 
                                 // Move our target snapshot into position
                                 targetSnapshot.frame = finishFrame;
                             }
                             supplementaryContainer.alpha = 0.0;
                         } completion:^(BOOL finished) {
                             // Add "to" controller view
                             [containerView addSubview:toControllerView];
                             
                             // Cleanup our animation views
                             [backgroundView removeFromSuperview];
                             [fromControllerSnapshot removeFromSuperview];
                             [fadeView removeFromSuperview];
                             [targetSnapshot removeFromSuperview];
                             
#if !defined(ZO_APP_EXTENSIONS)
                             [[UIApplication sharedApplication] endIgnoringInteractionEvents];
#endif
                             
                             [transitionContext completeTransition:finished];
                         }];
    } else {
        // Since the "to" controller isn't currently part of the view hierarchy, we need to use the
        // old snapshot API
        UIImageView *toControllerSnapshot = [[UIImageView alloc] initWithImage:[toControllerView zo_snapshot]];
        
        // Used to perform the fade, just like when presenting
        UIView *fadeView = [[UIView alloc] initWithFrame:containerView.bounds];
        fadeView.backgroundColor = _fadeColor;
        fadeView.alpha = 1.0;
        
        // The star of the show again, this time with the old snapshot API
        UIImageView *targetSnapshot = [[UIImageView alloc] initWithImage:[_targetView zo_snapshot]];
        targetSnapshot.frame = startFrame;
        
        // Check if the delegate provides any supplementary views
        NSArray *supplementaryViews = nil;
        if ([_delegate respondsToSelector:@selector(supplementaryViewsForZolaZoomTransition:)]) {
            NSAssert([_delegate respondsToSelector:@selector(zolaZoomTransition:frameForSupplementaryView:relativeToView:)], @"supplementaryViewsForZolaZoomTransition: requires zolaZoomTransition:frameForSupplementaryView:relativeToView: to be implemented by the delegate. Implement zolaZoomTransition:frameForSupplementaryView:relativeToView: and try again.");
            supplementaryViews = [_delegate supplementaryViewsForZolaZoomTransition:self];
        }
        
        // Same as for presentation, except this time with the old snapshot API
        UIView *supplementaryContainer = [[UIView alloc] initWithFrame:containerView.bounds];
        supplementaryContainer.backgroundColor = [UIColor clearColor];
        for (UIView *supplementaryView in supplementaryViews) {
            UIImageView *supplementarySnapshot = [[UIImageView alloc] initWithImage:[supplementaryView zo_snapshot]];
            
            supplementarySnapshot.frame = [_delegate zolaZoomTransition:self
                                              frameForSupplementaryView:supplementaryView
                                                         relativeToView:toControllerView];
            
            [supplementaryContainer addSubview:supplementarySnapshot];
        }
        
        // We're switching the values such that the scale factor returns the same result
        // as when we were presenting
        CGFloat scaleFactor = startFrame.size.width / finishFrame.size.width;
        
        // This is also the same equation used when presenting and will result in the same point,
        // except this time it's the start point for the animation
        CGPoint startPoint = CGPointMake((-finishFrame.origin.x * scaleFactor) + startFrame.origin.x, (-finishFrame.origin.y * scaleFactor) + startFrame.origin.y);
        
        // Apply the transformation and set the origin before the animation begins
        toControllerSnapshot.transform = CGAffineTransformMakeScale(scaleFactor, scaleFactor);
        if (!isnan(startPoint.x) && !isnan(startPoint.y)) {
            toControllerSnapshot.frame = CGRectMake(startPoint.x, startPoint.y, toControllerSnapshot.frame.size.width, toControllerSnapshot.frame.size.height);
        }
        
        // Apply the same transform and starting position to the supplementary container
        //        supplementaryContainer.transform = toControllerSnapshot.transform;
        //        supplementaryContainer.frame = toControllerSnapshot.frame;
        //        supplementaryContainer.alpha = 0.0;
        //
        // Assemble the view hierarchy in the container
        [containerView addSubview:toControllerSnapshot];
        //        [containerView addSubview:fadeView];
        [containerView addSubview:targetSnapshot];
        //        [containerView addSubview:supplementaryContainer];
        
        // Animate dismissal
        [UIView animateWithDuration:[self transitionDuration:transitionContext]
                              delay:0.0
                            options:UIViewAnimationOptionCurveEaseInOut
                         animations:^{
                             // Put the "to" snapshot back to it's original state
                             toControllerSnapshot.transform = CGAffineTransformIdentity;
                             toControllerSnapshot.frame = toControllerView.frame;
                             
                             //                             // Transform and move the supplementary container with the "to" snapshot
                             //                             supplementaryContainer.transform = toControllerSnapshot.transform;
                             //                             supplementaryContainer.frame = toControllerSnapshot.frame;
                             //
                             //                             // Fade
                             ////                             fadeView.alpha = 0.0;
                             //                             supplementaryContainer.alpha = 1.0;
                             
                             // Move the target snapshot into place
                             targetSnapshot.frame = finishFrame;
                         } completion:^(BOOL finished) {
                             // Add "to" controller view
                             [containerView addSubview:toControllerView];
                             
                             // Cleanup our animation views
                             [backgroundView removeFromSuperview];
                             [toControllerSnapshot removeFromSuperview];
                             //                             [fadeView removeFromSuperview];
                             [targetSnapshot removeFromSuperview];
                             
#if !defined(ZO_APP_EXTENSIONS)
                             [[UIApplication sharedApplication] endIgnoringInteractionEvents];
#endif
                             
                             [transitionContext completeTransition:finished];
                         }];
    }
}

- (NSTimeInterval)transitionDuration:(id <UIViewControllerContextTransitioning>)transitionContext {
    return _duration;
}

@end

@implementation LCTextLayer
- (void)drawInContext:(CGContextRef)ctx {
    CGFloat height, fontSize, yDiff;
    
    height = self.bounds.size.height;
    fontSize = self.fontSize;
    yDiff = (height-fontSize)/2 - fontSize/10;
    
    CGContextSaveGState(ctx);
    CGContextTranslateCTM(ctx, 0.0, yDiff);
    [super drawInContext:ctx];
    CGContextRestoreGState(ctx);
}
@end

#endif


extern "C" {
    
    
    //--------------------------------------
    //  Date Time Picker
    //--------------------------------------
    
    void _ISN_ShowDP(char* data, UnityAction callback) {
#if !TARGET_OS_TV
        OnDatePickedCallback = callback;
        [ISN_Logger LogNativeMethodInvoke:"_ISN_ShowDP" data:data];
        
        NSError *jsonError;
        ISN_UIDateTimePicker *request = [[ISN_UIDateTimePicker alloc] initWithChar:data error:&jsonError];
        if (jsonError) {
            [ISN_Logger LogError:@"_ISN_ShowDP JSON parsing error: %@", jsonError.description];
        }
        
        [[ISN_UIDateTime sharedInstance] DP_show:request];
#endif
    }
    
    
    
    void _ISN_UIRegisterDPChangeCallback(UnityAction callback) {
        OnDateChangedCallback = callback;
        
    }
    
    
    //------
    // Calendar
    //------
    
    void _ISN_PickDate(int startYear, UnityAction callback) {
        OnDatePickedCallback = callback;
        [[ISN_UIDateTime sharedInstance] pickDate:startYear];
    }
    
}


