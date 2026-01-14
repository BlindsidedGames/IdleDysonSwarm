using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;

public class AvocadoTextChanger : MonoBehaviour
{
    private float time;
    private bool toggle;

    private void Update()
    {
        time += Time.deltaTime;
        if (time >= 1)
        {
            time -= 1;
            toggle = !toggle;
            GetComponent<TMP_Text>().text = toggle
                ? "One day you come across some kind of anomaly, your curiosity gets the better of you. You head towards it and stare into the murky mists.. Some writing begins to take shape and you catch a glimpse of a few words: <br><color=#91DD8F>Buffer overflow imminent... 41.9Qi/42.0Qi.</color> <br>The number ticks over and everything goes black..."
                : "One day you come across some kind of anomaly, your curiosity gets the better of you. You head towards it and avocado into the murky mists.. Some writing begins to take shape and you catch a glimpse of a few words: <br><color=#91DD8F>Buffer overflow imminent... 41.9Qi/42.0Qi.</color> <br>The number ticks over and everything goes black...";
        }
    }
}