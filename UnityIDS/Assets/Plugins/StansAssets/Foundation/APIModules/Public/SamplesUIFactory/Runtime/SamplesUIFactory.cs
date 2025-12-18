using StansAssets.Foundation.Extensions;
using UnityEngine;
using UnityEngine.UI;

namespace SA.Foundation
{
    public class SamplesUIFactory
    {
        public void MakeButton(Transform parent, float parentContainerWidth)
        {
            var buttonRoot = new GameObject(string.Concat("Button_", parent.childCount + 1), typeof(RectTransform));
            buttonRoot.transform.SetParent(parent);
            buttonRoot.transform.Reset();

            var buttonCategoriesTabsViewRect = buttonRoot.GetComponent<RectTransform>();
            buttonCategoriesTabsViewRect.anchorMin = new Vector2(0f, 1f);
            buttonCategoriesTabsViewRect.anchorMax = new Vector2(0f, 1f);
            buttonCategoriesTabsViewRect.sizeDelta = new Vector2(parentContainerWidth, 150f);

            buttonRoot.AddComponent<Image>();
            buttonRoot.AddComponent<Button>();
            buttonRoot.AddComponent<LayoutElement>();

            //Add text to the button
            var textButtonCategoriesTabsView = new GameObject("Text", typeof(RectTransform));
            textButtonCategoriesTabsView.transform.SetParent(buttonRoot.transform);
            textButtonCategoriesTabsView.transform.Reset();
            textButtonCategoriesTabsView.GetComponent<RectTransform>().Reset();

            var text = textButtonCategoriesTabsView.AddComponent<Text>();
            text.text = buttonRoot.name;
            text.font = (Font)Resources.GetBuiltinResource(typeof(Font), "Arial.ttf");
            text.alignment = TextAnchor.MiddleCenter;
            text.resizeTextForBestFit = true;
            text.color = new Color32(50, 50, 50, 255);
        }

        public void MakeTabPanel(Transform parent)
        {
            //Create Panel
            var name = "Panel_" + (parent.childCount + 1);
            var panel = new GameObject(name, typeof(RectTransform));
            panel.transform.SetParent(parent);
            panel.transform.Reset();
            panel.GetComponent<RectTransform>().Reset();

            var rectTransform = panel.GetComponent<RectTransform>();
            rectTransform.Reset();
            rectTransform.anchorMin = new Vector2(0f, 1f);
            rectTransform.anchorMax = new Vector2(1f, 1f);
            rectTransform.pivot = new Vector2(0f, 1f);

            //Add Vertical Group Layout
            var verticalLg = panel.AddComponent<VerticalLayoutGroup>();
            verticalLg.spacing = 10f;
            verticalLg.childAlignment = TextAnchor.UpperLeft;
            verticalLg.childControlWidth = true;
            verticalLg.childControlHeight = false;
            verticalLg.childForceExpandWidth = true;
            verticalLg.childForceExpandHeight = false;

            //Add Content Size Fitter
            panel.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.MinSize;

            //Color
            panel.AddComponent<Image>().color = new Color32(200, 200, 200, 255);
        }
    }
}
