////////////////////////////////////////////////////////////////////////////////
//
// @module Assets Common Lib
// @author Osipov Stanislav (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;

namespace SA.iOS.Social
{
    class ISN_SocialConverter
    {
        //--------------------------------------
        // Constants
        //--------------------------------------

        public const string ArraySplitter = "%%%";
        public const string DataEof = "endofline";

        public static string SerializeArray(List<string> array, string splitter = ArraySplitter)
        {
            return SerializeArray(array.ToArray(), splitter);
        }

        public static string SerializeArray(string[] array, string splitter = ArraySplitter)
        {
            if (array == null)
            {
                return string.Empty;
            }
            else
            {
                if (array.Length == 0)
                {
                    return string.Empty;
                }
                else
                {
                    var serializedArray = "";
                    var len = array.Length;
                    for (var i = 0; i < len; i++)
                    {
                        if (i != 0) serializedArray += splitter;

                        serializedArray += array[i];
                    }

                    return serializedArray;
                }
            }
        }

        public static string[] ParseArray(string arrayData, string splitter = ArraySplitter)
        {
            var ParsedArray = new List<string>();
            var DataArray = arrayData.Split(new string[] { splitter }, StringSplitOptions.None);

            for (var i = 0; i < DataArray.Length; i++)
            {
                if (DataArray[i] == DataEof) break;

                ParsedArray.Add(DataArray[i]);
            }

            return ParsedArray.ToArray();
        }
    }
}
