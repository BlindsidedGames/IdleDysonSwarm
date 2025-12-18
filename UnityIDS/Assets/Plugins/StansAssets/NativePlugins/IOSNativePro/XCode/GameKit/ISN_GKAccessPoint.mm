//
//  ISN_ GKAccessPoint.m
//  UnityFramework
//
//  Created by Stanislav Osipov on 16.02.2021.
//

#import <Foundation/Foundation.h>
#import <GameKit/GameKit.h>

extern "C" {
    
    void _ISN_GKAccessPoint_setActive(bool active) {
        if (@available(iOS 14.0, *)) {
            [[GKAccessPoint shared] setActive:active];
        } else {
            // Fallback on earlier versions
        }
    }
    
    bool _ISN_GKAccessPoint_getActive() {
        if (@available(iOS 14.0, *)) {
            return [GKAccessPoint shared].active;
        } else {
            return false;
        }
    }
    
    void _ISN_GKAccessPoint_setLocation(int location) {
        if (@available(iOS 14.0, *)) {
            [[GKAccessPoint shared] setLocation: (GKAccessPointLocation) location];
        } else {
            // Fallback on earlier versions
        }
    }
    
    int _ISN_GKAccessPoint_getLocation() {
        if (@available(iOS 14.0, *)) {
            return (int) [GKAccessPoint shared].location;
        } else {
            return 0;
        }
    }

    bool _ISN_GKAccessPoint_getVisible() {
        if (@available(iOS 14.0, *)) {
            return [GKAccessPoint shared].visible;
        } else {
            return false;
        }
    }

    bool _ISN_GKAccessPoint_getIsPresentingGameCenter() {
        if (@available(iOS 14.0, *)) {
            return [GKAccessPoint shared].isPresentingGameCenter;
        } else {
            return false;
        }
    }

    bool _ISN_GKAccessPoint_getShowHighlights() {
        if (@available(iOS 14.0, *)) {
            return [GKAccessPoint shared].showHighlights;
        } else {
            return false;
        }
    }

    void _ISN_GKAccessPoint_setShowHighlights(bool val) {
        if (@available(iOS 14.0, *)) {
            [[GKAccessPoint shared] setShowHighlights: val];
        } else {
            // Fallback on earlier versions
        }
    }
}
