using UnityEngine;
// this script has been hijacked by the developer to go to the website instead of app store links.
public class AppStoreLink : MonoBehaviour
{
    public void OpenDeveloperAppStorePage()
    {
        Application.OpenURL("https://blindsidedgames.com/");

    }
}