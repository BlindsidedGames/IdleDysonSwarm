#if QC_HIDE_BUILTIN_ALL || QC_HIDE_BUILTIN_EXTRA
using System;

namespace QFSW.QC.Suggestors
{
    public class BuiltInCommandFilter : IQcSuggestionFilter
    {
        public bool IsSuggestionPermitted(IQcSuggestion suggestion, SuggestionContext context)
        {
            if (suggestion is CommandSuggestion commandSuggestion)
            {
                CommandData command = commandSuggestion.Command;
                Type declaringType = command.MethodData.DeclaringType;

                if (declaringType != null)
                {
                    string assemblyName = declaringType.Assembly.FullName;
                    bool rejected = false;
#if QC_HIDE_BUILTIN_ALL
                    rejected = assemblyName.StartsWith("QFSW.QC");
#elif QC_HIDE_BUILTIN_EXTRA
                    rejected = assemblyName.StartsWith("QFSW.QC.Extra");
#endif
                    return !rejected;
                }
            }

            return true;
        }
    }
}
#endif