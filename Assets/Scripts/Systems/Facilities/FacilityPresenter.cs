using UnityEngine;
using UnityEngine.UI;

namespace Systems.Facilities
{
    public sealed class FacilityPresenter : MonoBehaviour
    {
        [SerializeField] private string facilityId;
        [SerializeField] private Button breakdownButton;
        [SerializeField] private FacilityBreakdownPopup breakdownPopup;

        private void Start()
        {
            if (breakdownButton != null)
            {
                breakdownButton.onClick.AddListener(ShowBreakdown);
            }
        }

        public void ShowBreakdown()
        {
            if (string.IsNullOrEmpty(facilityId))
            {
                Debug.LogWarning("FacilityPresenter missing facility id.");
                return;
            }

            if (breakdownPopup == null)
            {
                breakdownPopup = FindFirstObjectByType<FacilityBreakdownPopup>();
            }

            if (breakdownPopup == null)
            {
                Debug.LogWarning("FacilityBreakdownPopup not found in scene.");
                return;
            }

            breakdownPopup.ShowFacility(facilityId);
        }
    }
}
