//
//  ISN_UIScreen.m
//  Unity-iPhone
//
//  Created by Stanislav Osipov on 2020-01-02.
//

#import "ISN_Foundation.h"
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

extern "C" {
    unsigned long _ISN_UI_UIScreen_MainScreen() {
        UIScreen *mainScreen = UIScreen.mainScreen;
        return [ISN_HashStorage Add:mainScreen];
    }

    unsigned long _ISN_UI_UIScreen_TraitCollection(unsigned long uiScreenHash) {
        UIScreen *uiScreen = (UIScreen*) [ISN_HashStorage Get:uiScreenHash];
        return [ISN_HashStorage Add: uiScreen.traitCollection];
    }
}
