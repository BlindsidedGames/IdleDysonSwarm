using UnityEngine;
using UnityEngine.UI;
using static Expansion.Oracle;

namespace Blindsided.Utilities
{
    public class MainTabController : MonoBehaviour
    {
        /*[SerializeField] protected Button nanites;
        public GameObject[] naniteObjects;

        [SerializeField] protected Button research;
        public GameObject[] researchObjects;

        [SerializeField] protected Button prestige;
        public GameObject[] prestigeObjects;

        [SerializeField] protected Button wiki;
        public GameObject[] wikiObjects;

        [SerializeField] protected Button settings;
        public GameObject[] settingsObjects;

        public GameObject[] toDisable;

        /*public string[] tabText;
    public TMP_Text[] tabTexts;#1#

        private Tab SavedTab {
            get => oracle.saveData.preferences.mainTab;
            set => oracle.saveData.preferences.mainTab = value;
        }

        private void Start()
        {
            nanites.onClick.AddListener(() => SetTab(Tab.Tab1));
            research.onClick.AddListener(() => SetTab(Tab.Tab2));
            prestige.onClick.AddListener(() => SetTab(Tab.Tab3));
            wiki.onClick.AddListener(() => SetTab(Tab.Tab4));
            settings.onClick.AddListener(() => SetTab(Tab.Tab5));
            SetSavedTab(SavedTab);
        }


        private void EnableAllButtons()
        {
            nanites.interactable = true;
            research.interactable = true;
            prestige.interactable = true;
            wiki.interactable = true;
            settings.interactable = true;
        }

        private void DisableAll()
        {
            foreach (GameObject item in toDisable) item.SetActive(false);
            //for (int i = 0; i < tabTexts.Length; i++) tabTexts[i].text = $"{tabText[i]}";
        }

        public void SetTab(Tab t)
        {
            DisableAll();
            EnableAllButtons();
            switch (t)
            {
                case Tab.Tab1:
                    SavedTab = Tab.Tab1;
                    foreach (GameObject item in naniteObjects) item.SetActive(true);
                    nanites.interactable = false;
                    //tabTexts[0].text = tabText[0];
                    break;
                case Tab.Tab2:
                    SavedTab = Tab.Tab2;
                    foreach (GameObject item in researchObjects) item.SetActive(true);
                    research.interactable = false;
                    //tabTexts[1].text = tabText[1];
                    break;
                case Tab.Tab3:
                    SavedTab = Tab.Tab3;
                    foreach (GameObject item in prestigeObjects) item.SetActive(true);
                    prestige.interactable = false;
                    //tabTexts[2].text = tabText[2];
                    break;
                case Tab.Tab4:
                    SavedTab = Tab.Tab4;
                    foreach (GameObject item in wikiObjects) item.SetActive(true);
                    wiki.interactable = false;
                    //tabTexts[3].text = tabText[3];
                    break;
                case Tab.Tab5:
                    SavedTab = Tab.Tab5;
                    foreach (GameObject item in settingsObjects) item.SetActive(true);
                    settings.interactable = false;
                    //tabTexts[4].text = tabText[4];
                    break;
                default:
                    Debug.Log("NoTab");
                    break;
            }
        }

        private void SetSavedTab(Tab t)
        {
            switch (t)
            {
                case Tab.Tab1:
                    nanites.onClick.Invoke();
                    break;
                case Tab.Tab2:
                    research.onClick.Invoke();
                    break;
                case Tab.Tab3:
                    prestige.onClick.Invoke();
                    break;
                case Tab.Tab4:
                    wiki.onClick.Invoke();
                    break;
                case Tab.Tab5:
                    settings.onClick.Invoke();
                    break;
                default:
                    Debug.Log("NoTab");
                    break;
            }
        }*/
    }
}