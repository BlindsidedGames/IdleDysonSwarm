using SA.iOS.Foundation;
using UnityEngine;

namespace SA.iOS.Examples
{
    public class ISN_FoundationExamples
    {
        public void LocaleInfo()
        {
            var currentLocale = ISN_NSLocale.CurrentLocale;
            Debug.Log("currentLocale.Identifier: " + currentLocale.Identifier);
            Debug.Log("currentLocale.CountryCode: " + currentLocale.CountryCode);
            Debug.Log("currentLocale.CurrencyCode: " + currentLocale.CurrencyCode);
            Debug.Log("currentLocale.LanguageCode: " + currentLocale.LanguageCode);
            Debug.Log("currentLocale.CurrencySymbol: " + currentLocale.CurrencySymbol);
        }
    }
}
