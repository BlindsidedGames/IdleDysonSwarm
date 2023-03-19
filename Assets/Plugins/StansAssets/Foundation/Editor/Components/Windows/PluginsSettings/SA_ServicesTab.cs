using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using SA.Foundation.Editor;
using StansAssets.Plugins.Editor;

namespace SA.Foundation.Editor
{
    public abstract class SA_ServicesTab : IMGUILayoutElement
    {
        List<SA_ServiceLayout> m_services = new List<SA_ServiceLayout>();

        protected abstract void OnCreateServices();

        public override void OnAwake()
        {
            OnCreateServices();
            foreach (var service in m_services) service.OnAwake();
        }

        public override void OnLayoutEnable()
        {
            base.OnLayoutEnable();
            foreach (var service in m_services) service.OnLayoutEnable();
        }

        public SA_ServiceLayout GetBlockByTypeName(string typeName)
        {
            foreach (var service in m_services)
                if (service.GetType().Name.Equals(typeName))
                    return service;

            return null;
        }

        public override void OnGUI()
        {
            foreach (var service in m_services) service.OnGUI();
        }

        public void OnSearchGUI(string pattern)
        {
            foreach (var service in m_services) service.OnSearchGUI(pattern);
        }

        public SA_ServiceLayout SelectedService
        {
            get
            {
                foreach (var service in m_services)
                    if (service.IsSelected)
                        return service;

                return null;
            }
        }

        protected void RegisterService(SA_ServiceLayout service)
        {
            m_services.Add(service);
        }
    }
}
