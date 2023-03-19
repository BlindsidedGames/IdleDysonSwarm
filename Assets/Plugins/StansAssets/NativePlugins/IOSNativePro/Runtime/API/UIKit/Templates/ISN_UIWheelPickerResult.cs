using System;
using UnityEngine;
using SA.Foundation.Templates;
using StansAssets.Foundation;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// This type for saving data from ISN_UIWheelPicker callback.
    /// </summary>
    [Serializable]
    public class ISN_UIWheelPickerResult : SA_Result
    {
        [SerializeField]
        public string m_Value;
        [SerializeField]
        public string m_State;

        /// <summary>
        /// Get chosen value from ISN_UIWheelPicker callback.
        /// </summary>
        public string Value => m_Value;

        /// <summary>
        /// Get current state of ISN_UIWheelPicker callback.
        /// </summary>
        public ISN_UIWheelPickerStates State =>
            EnumUtility.TryParseEnum<ISN_UIWheelPickerStates>(m_State, out var  state) 
                ? state 
                : ISN_UIWheelPickerStates.Canceled;
    }
}
