////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin for Unity3D
// @author Osipov Stanislav (Stan's Assets)
// @support stans.assets@gmail.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using System.Runtime.InteropServices;
using SA.iOS.AuthenticationServices;
using SA.iOS.UIKit;
using UnityEngine;

namespace SA.iOS.Examples
{
    public class ISN_AppleSignInUseExample : ISN_BaseIOSFeaturePreview
    {
        //--------------------------------------
        //  PUBLIC METHODS
        //--------------------------------------

        void OnGUI()
        {
            UpdateToStartPos();
            GUI.Label(new Rect(StartX, StartY, Screen.width, 40), "Apple Sing In", style);
            StartY += YLableStep;

            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Sing In"))
            {
                if (ISN_UIDevice.CurrentDevice.MajorIOSVersion >= 13)
                {
                    var provider = new ISN_ASAuthorizationAppleIDProvider();
                    var request = provider.CreateRequest();

                    var requests = new ISN_ASAuthorizationRequest[] {request};
                    var authorizationController = new ISN_ASAuthorizationController(requests);

                    var @delegate = new AuthorizationDelegateExample();
                    authorizationController.SetDelegate(@delegate);
                    authorizationController.PerformRequests();
                }
                else
                {
                    Debug.LogError("iOS 13 or higher required!");
                }
            }
        }
    }
}

/*

        ASAuthorizationAppleIDProvider* provider = [[ASAuthorizationAppleIDProvider alloc] init];
               ASAuthorizationAppleIDRequest* request = [provider createRequest];

      //  NSArray<ASAuthorizationScope> *scopes =  [NSArray arrayWithObjects:ASAuthorizationScopeFullName,ASAuthorizationScopeEmail, nil];
        [request setRequestedScopes:@[ASAuthorizationScopeFullName, ASAuthorizationScopeEmail]];


       //  ASAuthorizationPasswordRequest* pwdRequest =  [[[ASAuthorizationPasswordProvider alloc] init] createRequest];
       // pwdRequest setc

      //  ASAuthorizationPasswordProvider().createRequest()

        NSArray<ASAuthorizationAppleIDRequest*> * requests = @[pwdRequest];
         ASAuthorizationController* authorizationController = [[ASAuthorizationController alloc] initWithAuthorizationRequests:requests];

        s_DefaultPresentationContextProviding = [[DefaultrPresentationContextProviding alloc] init];

       s_MyDelegate = [[MyDelegate alloc] init];
        authorizationController.delegate = s_MyDelegate;
        authorizationController.presentationContextProvider = s_DefaultPresentationContextProviding;
        [authorizationController performRequests];

*/
