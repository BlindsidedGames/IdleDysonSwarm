using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MenuToggleController : MonoBehaviour
{
    [SerializeField] private GameObject toToggle;

    public void Toggle(bool hide)
    {
        toToggle.SetActive(!hide);
    }
}