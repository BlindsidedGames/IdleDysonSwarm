////////////////////////////////////////////////////////////////////////////////
//  
// @module IOS Native Plugin for Unity3D 
// @author Osipov Stanislav (Stan's Assets) 
// @support stans.assets@gmail.com 
//
////////////////////////////////////////////////////////////////////////////////

using System;
using UnityEngine;
using SA.iOS.StoreKit;

namespace SA.iOS.Examples
{
    public class ISN_MarketExample : ISN_BaseIOSFeaturePreview
    {
        static readonly ISN_PaymentManagerExample s_paymentManager = new ISN_PaymentManagerExample();

        void OnGUI()
        {
            UpdateToStartPos();

            GUI.Label(new Rect(StartX, StartY, Screen.width, 40), "In-App Purchases", style);

            StartY += YLableStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Load Store")) s_paymentManager.init();

            if (ISN_SKPaymentQueue.IsReady)
                GUI.enabled = true;
            else
                GUI.enabled = false;

            StartX = XStartPos;
            StartY += YButtonStep;

            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Perform Buy #1"))
            {
                var CurrencySymbol = ISN_SKPaymentQueue.GetProductById(ISN_PaymentManagerExample.SMALL_PACK).PriceLocale.CurrencySymbol;

                Debug.Log(CurrencySymbol);

                //ISN_SKPaymentQueue.AddPayment(ISN_PaymentManagerExample.SMALL_PACK);
            }

            StartX += XButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Perform Buy #2")) ISN_SKPaymentQueue.AddPayment(ISN_PaymentManagerExample.NC_PACK);

            StartX += XButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Restore Purchases")) ISN_SKPaymentQueue.RestoreCompletedTransactions();

            StartX += XButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Is Payments Enabled On device")) Debug.Log("Is Payments Enabled: " + ISN_SKPaymentQueue.CanMakePayments);

            StartX = XStartPos;
            StartY += YButtonStep;
            StartY += YLableStep;

            GUI.enabled = true;
            GUI.Label(new Rect(StartX, StartY, Screen.width, 40), "Local Receipt Validation", style);

            StartY += YLableStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth + 10, buttonHeight), "Print Load Receipt"))
            {
                var receipt = ISN_SKPaymentQueue.AppStoreReceipt;

                Debug.Log("Receipt loaded, byte array length: " + receipt.Data.Length + " Would you like to veriday it with Apple Sandbox server?");
                Debug.Log("Receipt As Base64 String" + receipt.AsBase64String);
            }

            StartX += XButtonStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth, buttonHeight), "Refresh Receipt"))
            {
                //Thiss is optional values for test evironment, 
                //for production evironment use properties = null

                var properties = new ISN_SKReceiptDictionary();
                properties.Add(ISN_SKReceiptProperty.IsExpired, 0);
                properties.Add(ISN_SKReceiptProperty.IsRevoked, 1);

                var request = new ISN_SKReceiptRefreshRequest(properties);
                request.Start((result) =>
                {
                    Debug.Log("Receipt Refresh Result: " + result.IsSucceeded);
                    if (result.HasError) Debug.Log(result.Error.Code + " / " + result.Error.Message);
                });
            }

            StartX = XStartPos;
            StartY += YButtonStep;
            StartY += YLableStep;

            GUI.enabled = true;
            GUI.Label(new Rect(StartX, StartY, Screen.width, 40), "Store Review Controller", style);

            StartY += YLableStep;
            if (GUI.Button(new Rect(StartX, StartY, buttonWidth + 10, buttonHeight), "Request Review")) ISN_SKStoreReviewController.RequestReview();
        }
    }
}
