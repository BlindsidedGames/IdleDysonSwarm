using System;
using System.Collections;
using System.Collections.Generic;
using Sirenix.OdinInspector;
using UnityEditor;
using UnityEngine;

public class CategoryStateSaver : MonoBehaviour
{
    [SerializeField] private string guid;
    [SerializeField] private ButtonThings open;
    [SerializeField] private ButtonThings close;

    private void Start()
    {
        if (string.IsNullOrEmpty(guid))
        {
            Debug.Log("GUID not set" + transform);
            return;
        }

        var state = PlayerPrefs.GetInt(guid);
        switch (state)
        {
            case 0:
                close.GroupEnableDisable();
                break;
            case 1:
                open.GroupEnableDisable();
                break;
        }
    }

    [Button("SetGUID")]
    public void SetGUID()
    {
        var guid = Guid.NewGuid();
        this.guid = guid.ToString();
    }

    public void SetState(int state)
    {
        PlayerPrefs.SetInt(guid, state);
    }
}