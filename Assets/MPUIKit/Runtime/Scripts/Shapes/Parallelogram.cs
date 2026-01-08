using System;
using UnityEngine;

namespace MPUIKIT
{
	[Serializable]
	public struct Parallelogram : IMPUIComponent
	{
		[SerializeField] private float m_Skew;
		[SerializeField] private float m_CornerRadius;
		
		public Material SharedMat { get; set; }
		public bool ShouldModifySharedMat { get; set; }
		public RectTransform RectTransform { get; set; }
        
        
		private static readonly int SpParallelogramSkew = Shader.PropertyToID("_ParallelogramSkew");
		private static readonly int Radius = Shader.PropertyToID("_ParallelogramCornerRadius");

		public float Skew {
			get => m_Skew;
			set {
				m_Skew = value;
				if (ShouldModifySharedMat) {
					SharedMat.SetFloat(SpParallelogramSkew, m_Skew);
				}
				OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
			}
		}
		
		public float CornerRadius {
			get => m_CornerRadius;
			set {
				m_CornerRadius = value;
				if (ShouldModifySharedMat) {
					SharedMat.SetFloat(Radius, m_CornerRadius);
				}
				OnComponentSettingsChanged?.Invoke(this, EventArgs.Empty);
			}
		}

		public void Init(Material sharedMat, Material renderMat, RectTransform rectTransform) {
			SharedMat = sharedMat;
			ShouldModifySharedMat = sharedMat == renderMat;
			RectTransform = rectTransform;
		}

		public event EventHandler OnComponentSettingsChanged;

		public void OnValidate()
		{
			Skew = m_Skew;
			CornerRadius = m_CornerRadius;
		}

		public void InitValuesFromMaterial(ref Material material)
		{
			m_Skew = material.GetFloat(SpParallelogramSkew);
			m_CornerRadius = material.GetFloat(Radius);
		}

		public void ModifyMaterial(ref Material material, params object[] otherProperties)
		{
			material.SetFloat(SpParallelogramSkew, Skew);
			material.SetFloat(Radius, CornerRadius);
		}
	}
}