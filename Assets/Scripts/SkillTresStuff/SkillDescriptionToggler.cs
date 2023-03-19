using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class SkillDescriptionToggler : MonoBehaviour
{
    [SerializeField] private Toggle t;

    private void Start()
    {
        t.isOn = !oracle.saveSettings.skillsBuyOnTap;
    }

    public void SetDesc(bool b)
    {
        oracle.saveSettings.skillsBuyOnTap = !b;
        oracle.InvokeUpdateSkills();
    }
}