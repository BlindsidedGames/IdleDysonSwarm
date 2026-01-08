////////////////////////////////////////////////////////////////////////////////
//  
// @module Assets Common Lib
// @author Osipov Stanislav (Stan's Assets) 
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

namespace SA.Foundation.Templates
{
    /// <summary>
    /// Error model
    /// </summary>
    public interface SA_iError
    {
        /// <summary>
        /// Error Code
        /// </summary>
        int Code { get; }

        /// <summary>
        /// Error Description Message
        /// </summary>
        string Message { get; }

        /// <summary>
        /// Formatted message that combines <see cref="Code"/> and <see cref="Message"/>
        /// </summary>
        string FullMessage { get; }
    }
}
