//
//  ISN_UITraitCollection.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-01-02.
//

#import "ISN_Foundation.h"
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

extern "C" {
    unsigned long _ISN_UI_TraitCollection_UserInterfaceStyle(unsigned long traitCollectionHash) {
        UITraitCollection * traitCollection = (UITraitCollection*) [ISN_HashStorage Get:traitCollectionHash];
        if (@available(iOS 12.0, *)) {
            return traitCollection.userInterfaceStyle;
        } else {
            //Undefined
            return 0;
        }
    }
}
