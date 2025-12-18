using System;
using Sirenix.OdinInspector;
using UnityEngine;
using UnityEngine.UI;

namespace Blindsided.Utilities
{
    public class CategoryStateSaver : MonoBehaviour
    {
        [SerializeField] private string guid;
        [SerializeField] private GameObject[] openObjects;
        [SerializeField] private GameObject[] closeObjects;
        [SerializeField] private Button openButton;
        [SerializeField] private Button closeButton;

        private void Start()
        {
            openButton.onClick.AddListener(() => SetState(1));
            closeButton.onClick.AddListener(() => SetState(0));
            if (string.IsNullOrEmpty(guid)) {
                Debug.Log("GUID not set" + transform);
                return;
            }

            int state = PlayerPrefs.GetInt(guid);
            switch (state) {
                case 0:
                    Close();
                    break;
                case 1:
                    Open();
                    break;
            }
        }

        [Button("SetGUID")]
        public void SetGUID()
        {
            Guid guid = Guid.NewGuid();
            this.guid = guid.ToString();
        }

        public void SetState(int state)
        {
            PlayerPrefs.SetInt(guid, state);
            switch (state) {
                case 0:
                    Close();
                    break;
                case 1:
                    Open();
                    break;
            }
        }

        private void Open()
        {
            foreach (GameObject item in openObjects) {
                item.SetActive(true);
            }
            foreach (GameObject item in closeObjects) {
                item.SetActive(false);
            }
        }
        private void Close()
        {
            foreach (GameObject item in openObjects) {
                item.SetActive(false);
            }
            foreach (GameObject item in closeObjects) {
                item.SetActive(true);
            }
        }
    }
}