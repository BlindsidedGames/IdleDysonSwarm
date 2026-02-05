using QFSW.QC.Utilities;
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using Object = UnityEngine.Object;

namespace QFSW.QC.Suggestors
{
    public class ComponentSuggestor : BasicCachedQcSuggestor<string>
    {
        protected override bool CanProvideSuggestions(SuggestionContext context, SuggestorOptions options)
        {
            Type targetType = context.TargetType;
            return targetType != null
                && targetType.IsDerivedTypeOf(typeof(Component))
                && !targetType.IsGenericParameter;
        }

        protected override IQcSuggestion ItemToSuggestion(string name)
        {
            return new RawSuggestion(name, true);
        }

        protected override IEnumerable<string> GetItems(SuggestionContext context, SuggestorOptions options)
        {
#if UNITY_6000_0_OR_NEWER
            return Object.FindObjectsByType(context.TargetType, FindObjectsSortMode.None)
#else
            return Object.FindObjectsOfType(context.TargetType)
#endif
                .Select(cmp => (Component) cmp)
                .Select(cmp => cmp.gameObject.name);
        }
    }
}