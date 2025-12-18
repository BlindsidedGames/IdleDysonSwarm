using System;
using System.Collections.Generic;
using Unity.Mathematics;
using UnityEngine;
using static Expansion.Oracle;
using Random = UnityEngine.Random;
using static Blindsided.Utilities.CalcUtils;

public class Rotator : MonoBehaviour
{
    public Transform itemToRotate;
    public float rotationSpeed = 45;
    public GameObject[] panels;
    private HashSet<int> _enabledIndices = new HashSet<int>();

    private void Start()
    {
        ResetPanels();
    }
    private void Update()
    {
        // Rotate once per second
        itemToRotate.Rotate(new Vector3(0, 0, rotationSpeed * Time.deltaTime));

        int panelsToEnable = math.min(MaxAffordable(Bots, 1, 1.24, 0), 200);

        SetRandomPanelsActive(panelsToEnable);
    }

    private void SetRandomPanelsActive(int panelsToEnable)
    {
        while (_enabledIndices.Count < panelsToEnable)
        {
            int randomIndex = Random.Range(0, panels.Length);
            if (_enabledIndices.Add(randomIndex))
            {
                panels[randomIndex].SetActive(true);
            }
        }
    }
    private void ResetPanels()
    {
        foreach (GameObject panel in panels)
        {
            panel.SetActive(false);
            _enabledIndices = new HashSet<int>();
        }
    }
    public static void ResetPanelsStatic()
    {
        Instance.ResetPanels();
    }

    //static instance
    public static Rotator Instance { get; private set; }
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
    }
}