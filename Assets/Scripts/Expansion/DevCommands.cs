using UnityEngine;
using UnityEngine.UI;
using static Oracle;

public class DevCommands : MonoBehaviour
{
    [SerializeField] private Button enableDoubletime;
    [SerializeField] private Button clearDream1Progress;
    [SerializeField] private Button giveInfluence;

    private void Start()
    {
        enableDoubletime.onClick.AddListener(ToggleDoubleTime);
        clearDream1Progress.onClick.AddListener(ClearD1Progress);
        giveInfluence.onClick.AddListener(GiveInfluence);
    }

    private void GiveInfluence()
    {
        oracle.saveSettings.saveData.influence += 10000;
    }

    private void ClearD1Progress()
    {
        oracle.WipeDream1Save();
    }

    private void ToggleDoubleTime()
    {
        oracle.saveSettings.sdPrestige.doDoubleTime = !oracle.saveSettings.sdPrestige.doDoubleTime;
        oracle.saveSettings.sdPrestige.doubleTime = 999999999;
    }
}