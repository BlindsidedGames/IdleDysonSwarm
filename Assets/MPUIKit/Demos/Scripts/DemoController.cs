using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class DemoController : MonoBehaviour
{
	[SerializeField] private GameObject[] m_Demos;

	private int _currentDemo;

	public void Move(int count)
	{
		m_Demos[_currentDemo].gameObject.SetActive(false);
		_currentDemo += count;
		if (_currentDemo < 0) _currentDemo = m_Demos.Length - 1;
		if (_currentDemo >= m_Demos.Length) _currentDemo = 0;
		m_Demos[_currentDemo].gameObject.SetActive(true);
	}
}