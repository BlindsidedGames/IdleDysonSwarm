using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using StansAssets.IOS.XCode;

namespace SA.iOS
{
    abstract class ISN_LSApplicationQueriesSchemesResolver : ISN_APIResolver
    {
        protected override void RemoveXcodePlistKey(InfoPlistKey key)
        {
            if (key.Name.Equals("LSApplicationQueriesSchemes"))
            {
                var existingKey = XCodeProject.GetInfoPlistKey("LSApplicationQueriesSchemes");
                if (existingKey == null) return;

                var keysToRemove = new List<InfoPlistKey>();
                foreach (var testeChild in key.Children)
                {
                    var existingChild = existingKey.GetChildByStringValue(testeChild.StringValue);
                    if (existingChild != null) keysToRemove.Add(existingChild);
                }

                if (keysToRemove.Count == existingKey.Children.Count)
                    XCodeProject.RemoveInfoPlistKey(existingKey);
                else
                    foreach (var removeKey in keysToRemove)
                        existingKey.RemoveChild(removeKey);
            }
            else
            {
                base.RemoveXcodePlistKey(key);
            }
        }

        protected override void AddXcodePlistKey(InfoPlistKey key)
        {
            if (key.Name.Equals("LSApplicationQueriesSchemes"))
            {
                var existingKey = XCodeProject.GetInfoPlistKey("LSApplicationQueriesSchemes");
                if (existingKey == null)
                {
                    XCodeProject.SetInfoPlistKey(key);
                }
                else
                {
                    var missingKeys = new List<InfoPlistKey>();

                    foreach (var testeChild in key.Children)
                    {
                        var contains = false;
                        foreach (var child in existingKey.Children)
                            if (child.StringValue.Equals(testeChild.StringValue))
                                contains = true;
                        if (!contains) missingKeys.Add(testeChild);
                    }

                    foreach (var child in missingKeys) existingKey.AddChild(child);
                }
            }
            else
            {
                base.AddXcodePlistKey(key);
            }
        }
    }
}
