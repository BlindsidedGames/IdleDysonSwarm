using System.Collections.Generic;
using UnityEngine;
using System;
using UnityEngine.Assertions;

namespace SA.iOS.UIKit
{
    /// <summary>
    /// Object that create and control WheelPicker for iOS.
    /// In this controller we need to set data that UIPickerView should show
    /// and add listeners, that will be called when user will choose some option or
    /// Done/Cancel picking process.
    /// </summary>
    [Serializable]
    public class ISN_UIWheelPickerController
    {
        [SerializeField]
        List<string> m_Values;

        [SerializeField]
        int m_Default;

        /// <summary>
        /// Here we cate instance of UIWheelPicker controller.
        /// </summary>
        /// <param name="values">
        /// It's list of elements that should be shown in UIWheelPicker
        /// </param>
        /// <param name="defaultValueIndex">Default value index.</param>
        public ISN_UIWheelPickerController(List<string> values, int defaultValueIndex = 0)
        {
            m_Values = values;
            m_Default = defaultValueIndex;
        }

        /// <summary>
        /// Picker values.
        /// </summary>
        public List<string> Values => m_Values;

        /// <summary>
        /// Default value index. `0` by default.
        /// </summary>
        public int DefaultValueIndex => m_Default;

        /// <summary>
        /// Show UIWheelPicker.
        /// </summary>
        /// <param name="callback">
        /// This is callback that will be called from UiWheelPicker
        /// when user will change it state or done/cancel option.
        /// It shouldn't be null.
        /// </param>
        public void Show(Action<ISN_UIWheelPickerResult> callback)
        {
            Assert.IsNotNull(callback);
            ISN_UILib.Api.ShowUIWheelPicker(this, callback);
        }
    }
}
