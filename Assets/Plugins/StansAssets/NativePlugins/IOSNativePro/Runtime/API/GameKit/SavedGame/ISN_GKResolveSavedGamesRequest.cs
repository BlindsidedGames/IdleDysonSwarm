////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;
using System.Text;
using UnityEngine;

namespace SA.iOS.GameKit
{
    [Serializable]
    class ISN_GKResolveSavedGamesRequest
    {
        [SerializeField]
        List<string> m_ConflictedGames = new List<string>();
        [SerializeField]
        string m_Data = string.Empty;

        public ISN_GKResolveSavedGamesRequest(List<string> list, string stringData)
        {
            m_ConflictedGames = list;
            m_Data = stringData;
        }

        public string DataStringValue => m_Data;
        public byte[] DataByteValue => Encoding.UTF8.GetBytes(m_Data);
        public List<string> ConflictedGames => m_ConflictedGames;
    }
}
