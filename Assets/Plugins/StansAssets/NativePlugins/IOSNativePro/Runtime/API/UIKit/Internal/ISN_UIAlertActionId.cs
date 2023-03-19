using System;
using UnityEngine;

namespace SA.iOS.UIKit
{
    [Serializable]
    class ISN_UIAlertActionId
    {
        [SerializeField]
        int m_AlertId = 0;
        [SerializeField]
        int m_ActionId = 0;

        public int AlertId => m_AlertId;

        public int ActionId => m_ActionId;
    }
}
