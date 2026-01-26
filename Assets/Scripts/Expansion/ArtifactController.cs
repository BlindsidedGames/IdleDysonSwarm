using MPUIKIT;
using TMPro;
using UnityEngine;
using Blindsided.Utilities;
using static Expansion.Oracle;

public class ArtifactController : MonoBehaviour
{
    [SerializeField] private MPImage artifactFill;
    [SerializeField] private TMP_Text theArtifactText;
    private float artifactTime;
    [SerializeField] private TMP_Text artifactBarUndefinedText;

    private SaveDataPrestige sp => oracle.saveSettings.sdPrestige;

    private void Start()
    {
        artifactTime = 0;
    }

    private void Update()
    {
        artifactBarUndefinedText.text = sp.speed8 ? "<color=white>CPU Time" : "Undefined";

        int speed = 60;
        if (sp.speed1) speed = 57;
        if (sp.speed2) speed = 54;
        if (sp.speed3) speed = 48;
        if (sp.speed4) speed = 42;
        if (sp.speed5) speed = 30;
        if (sp.speed6) speed = 15;
        if (sp.speed7) speed = 6;
        if (!sp.speed8)
        {
            artifactTime += speed * Time.deltaTime;

            artifactFill.fillAmount = artifactTime / 1;

            if (artifactTime >= 1)
            {
                theArtifactText.text = Translation();
                theArtifactText.text = theArtifactText.text.Scramble();
                artifactTime = 0;
            }
        }
        else
        {
            theArtifactText.text = Translation();
            artifactFill.fillAmount = 0;
        }
    }

    private string Translation()
    {
        string text = "The Artifact";
        if (!sp.translation1) text = text.Replace("i", "|");
        if (!sp.translation2) text = text.Replace("r", "}");
        if (!sp.translation3) text = text.Replace("e", "%");
        if (!sp.translation4) text = text.Replace("f", "$");
        if (!sp.translation5) text = text.Replace("c", "{");
        if (!sp.translation6) text = text.Replace("h", "*");
        if (!sp.translation7) text = text.Replace("a", "@");
        if (!sp.translation7) text = text.Replace("A", "#");
        if (!sp.translation8) text = text.Replace("t", "^");
        if (!sp.translation8) text = text.Replace("T", "&");
        return text;
    }
}
