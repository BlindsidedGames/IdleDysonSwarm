using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ColumnManager : MonoBehaviour
{
    private FlexibleGridLayout flex;
    private RectTransform rect;
    private void Start()
    {
        flex = GetComponent<FlexibleGridLayout>();
        rect = GetComponent<RectTransform>();
    }

    void Update()
    {
        if (rect.sizeDelta.x >= 1600)
        {
            flex.columns = 3;
        }
        else if (rect.sizeDelta.x >= 1100)
        {
            flex.columns = 2;
        }
        else
        {
            flex.columns = 1;
        }
    }
}
