using TMPro;
using UnityEngine;
using static Expansion.Oracle;

public class MessageOfTheDay : MonoBehaviour
{
    [SerializeField] private TMP_Text motd;

    private void Start()
    {
        InvokeRepeating("SetNews", 0, 1f);
    }

    private void SetNews()
    {
        if (oracle.gotNews)
            motd.text = "Message of the day!" + $"\n <size=80%>{oracle.bsGamesData.newsTicker}";
        else
            motd.text = "Message of the day!" + "\n <size=80%>Unable to retrieve MOTD";
    }
}