////////////////////////////////////////////////////////////////////////////////
//
// @module IOS Native Plugin
// @author Koretsky Konstantin (Stan's Assets)
// @support support@stansassets.com
// @website https://stansassets.com
//
////////////////////////////////////////////////////////////////////////////////

using System;
using StansAssets.Foundation;
using UnityEngine;

namespace SA.iOS.GameKit
{
    /// <summary>
    /// The saved game data.
    ///
    /// Each GKSavedGame object contains the following information about a saved game:
    /// the name of the device that created the saved game file,
    /// the date the saved game file was modified,
    /// and the name of the saved game file.
    /// Saved game files are manipulated through the local player
    /// </summary>
    [Serializable]
    public class ISN_GKSavedGame
    {
        [SerializeField]
        string m_DeviceName = string.Empty;
        [SerializeField]
        long m_ModificationDate = 0;
        [SerializeField]
        string m_Name = string.Empty;
        [SerializeField]
        string m_Id = string.Empty;

        /// <summary>
        /// The name of the device that created the saved game data.
        ///
        /// The device name is equal to whatever the user has named his or her device.
        /// For example, “Bob’s iPhone”, “John’s Macbook Pro”.
        /// </summary>
        public string DeviceName
        {
            get => m_DeviceName;
            set => m_DeviceName = value;
        }

        /// <summary>
        /// The name of the saved game.
        /// You can allow users to name their own saved games, or you can create a saved game name automatically.
        /// </summary>
        public string Name
        {
            get => m_Name;
            set => m_Name = value;
        }
        
        /// <summary>
        /// Id of the saved game record.
        /// </summary>
        public string Id
        {
            get => m_Id;
            set => m_Id = value;
        }

        /// <summary>
        /// The date when the saved game file was modified.
        /// </summary>
        public DateTime ModificationDate => TimeUtility.FromUnixTime(m_ModificationDate);

        /// <summary>
        /// Loads saved game data
        /// </summary>
        public void Load(Action<ISN_GKSavedGameLoadResult> callback)
        {
            ISN_GKLocalPlayer.LoadGameData(this, callback);
        }
    }
}
