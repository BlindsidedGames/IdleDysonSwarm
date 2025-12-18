using UnityEngine;

namespace Blindsided.Utilities
{
    public class GroupEnableDisable : MonoBehaviour
    {
        public GameObject[] objectsToEnable;
        public GameObject[] objectsToDisable;
        private void Start()
        {
            foreach (GameObject obj in objectsToEnable) {
                obj.SetActive(true);
            }
            foreach (GameObject obj in objectsToDisable) {
                obj.SetActive(false);
            }
        }


    }
}