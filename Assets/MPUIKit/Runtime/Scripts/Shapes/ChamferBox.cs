using System;
using UnityEngine;

namespace MPUIKIT
{
	[Serializable]
	public struct ChamferBox : IMPUIComponent
	{
		[SerializeField] private float m_ChamferSize;
		public Material SharedMat { get; set; }
		public bool ShouldModifySharedMat { get; set; }
		public RectTransform RectTransform { get; set; }

		public event EventHandler OnComponentSettingsChanged;
        
		private static readonly int SpChamferSize = Shader.PropertyToID("_ChamferSize");

		public void Init(Material sharedMat, Material renderMat, RectTransform rectTransform) {
			SharedMat = sharedMat;
			ShouldModifySharedMat = sharedMat == renderMat;
			RectTransform = rectTransform;
		}

		public void OnValidate() 
		{
			m_ChamferSize = Mathf.Max(m_ChamferSize, 0f);
			if (ShouldModifySharedMat) {
				SharedMat.SetFloat(SpChamferSize, m_ChamferSize);
			}
			OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
		}

		public void InitValuesFromMaterial(ref Material material) 
		{
			m_ChamferSize = material.GetFloat(SpChamferSize);
			m_ChamferSize = Mathf.Max(m_ChamferSize, 0f);
			if (ShouldModifySharedMat) {
				SharedMat.SetFloat(SpChamferSize, m_ChamferSize);
			}
		}

		public void ModifyMaterial(ref Material material, params object[] otherProperties) {
			m_ChamferSize = Mathf.Max(m_ChamferSize, 0f);
			material.SetFloat(SpChamferSize, m_ChamferSize);
		}
	}
}