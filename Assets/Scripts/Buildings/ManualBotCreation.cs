using MPUIKIT;
using TMPro;
using Unity.Mathematics;
using UnityEngine;
using UnityEngine.UI;
using Blindsided.Utilities;
using static Expansion.Oracle;

public class ManualBotCreation : MonoBehaviour
{
    [SerializeField] private TMP_Text counter;
    [SerializeField] private TMP_Text description;
    [SerializeField] private GameObject clickHere;
    [SerializeField] private Button _button;

    [SerializeField] private MPImage fill;
    private DysonVerseInfinityData dvid => oracle.saveSettings.dysonVerseSaveData.dysonVerseInfinityData;
    private DysonVerseSkillTreeData dvst => oracle.saveSettings.dysonVerseSaveData.dysonVerseSkillTreeData;
    private DysonVerseSaveData dvsd => oracle.saveSettings.dysonVerseSaveData;
    private bool running;
    private float time;

    private void Start()
    {
        fill.fillAmount = 0;
        counter.text = $"{dvsd.manualCreationTime}s";
        clickHere.SetActive(true);
    }

    private void Update()
    {
        double manualLabourAmount = (dvid.assemblyLines[0] + dvid.assemblyLines[1]) / 50;
        double managerProduction = dvid.managerAssemblyLineProduction * 20;
        double assemblyProduction = math.min(manualLabourAmount, managerProduction);
        if (dvst.versatileProductionTactics) assemblyProduction *= 1.5;
        description.text = dvst.manualLabour
            ? $"Having nothing better to do you decide to set up some more assembly lines. Masterfully made you will produce <color=#00E1FF>{CalcUtils.FormatNumber(assemblyProduction)}"
            : "Manually put together a new bot from parts in your shed. <br>There has to be a better way of going about this...";
        if (running)
        {
            if (time < dvsd.manualCreationTime)
            {
                time += Time.deltaTime;
                fill.fillAmount = time / dvsd.manualCreationTime;
                counter.text = $"{(dvsd.manualCreationTime - time).ToString("F1")}s";
            }
            else
            {
                fill.fillAmount = 0;
                clickHere.SetActive(true);
                _button.interactable = true;
                dvid.bots += 1;


                if (dvst.manualLabour)
                    dvid.assemblyLines[0] += assemblyProduction;
                if (dvsd.manualCreationTime >= 1 && !dvst.manualLabour)
                    dvsd.manualCreationTime -= 1;
                else
                {
                    dvsd.manualCreationTime = 0.2f;
                }

                running = false;
                counter.text = $"{dvsd.manualCreationTime}s";
            }
        }
    }

    public void StartButton()
    {
        if (!running)
        {
            time = .1f;
            clickHere.SetActive(false);
            _button.interactable = false;
            running = true;
        }
    }
}
