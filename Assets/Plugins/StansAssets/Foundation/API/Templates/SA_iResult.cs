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
    public interface SA_iResult
    {
        /// <summary>
        /// Sets the error to result.
        /// </summary>
        ///  /// <param name="error">A predefined result error object.</param>
        void SetError(SA_Error error);

        /// <summary>
        /// Convert to the result json string.
        /// </summary>
        string ToJson();

        /// <summary>
        /// Gets the result error object. If Error message is empty,
        /// result is succeeded.
        /// </summary>
        SA_Error Error { get; }

        /// <summary>
        /// Gets a value indicating whether this <see cref="T:SA.Support.Templates.SA_Result"/> has error.
        /// </summary>
        /// <value><c>true</c> if has error; otherwise, <c>false</c>.</value>
        bool HasError { get; }

        /// <summary>
        /// Gets a value indicating whether this <see cref="T:SA.Support.Templates.SA_Result"/> is succeeded.
        /// </summary>
        /// <value><c>true</c> if is succeeded; otherwise, <c>false</c>.</value>
        bool IsSucceeded { get; }

        /// <summary>
        /// Gets a value indicating whether this <see cref="T:SA.Support.Templates.SA_Result"/> is failed.
        /// </summary>
        /// <value><c>true</c> if is failed; otherwise, <c>false</c>.</value>
        bool IsFailed { get; }

        /// <summary>
        /// Returns the id of the player who made the request in order to create correct data references
        /// </summary>
        string RequestId { get; }
    }
}
