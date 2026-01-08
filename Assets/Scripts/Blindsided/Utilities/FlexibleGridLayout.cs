using UnityEngine;
using UnityEngine.UI;

namespace Blindsided.Utilities
{
    public class FlexibleGridLayout : LayoutGroup
    {
        public enum FitType
        {
            Uniform,
            Width,
            Height,
            FixedRows,
            FixedColumns
        }

        public FitType fitType;
        public int rows;
        public int columns;
        public Vector2 cellSize;
        public Vector2 spacing;
        public bool fitX;
        public bool fitY;

        public LayoutElement layoutElement;

        public override void CalculateLayoutInputHorizontal()
        {
            base.CalculateLayoutInputHorizontal();

            if (fitType == FitType.Width || fitType == FitType.Height || fitType == FitType.Uniform)
            {
                fitX = true;
                fitY = true;
                var sqrRt = Mathf.Sqrt(transform.childCount);
                rows = Mathf.CeilToInt(sqrRt);
                columns = Mathf.CeilToInt(sqrRt);
            }

            if (fitType == FitType.Width || fitType == FitType.FixedColumns)
            {
                rows = Mathf.CeilToInt(transform.childCount / (float)columns);
                if (layoutElement != null) layoutElement.minHeight = cellSize.y * rows + spacing.y * (rows - 1);
            }

            if (fitType == FitType.Height || fitType == FitType.FixedRows)
                columns = Mathf.CeilToInt(transform.childCount / (float)rows);

            var parentWidth = rectTransform.rect.width;
            var parentHeight = rectTransform.rect.height;


            var cellWidth = (parentWidth - spacing.x * ((float)columns - 1) - padding.left - padding.right) / columns;
            var cellHeight = (parentHeight - spacing.y * ((float)rows - 1) - padding.top - padding.bottom) / rows;

            cellSize.x = fitX ? cellWidth : cellSize.x;
            cellSize.y = fitY ? cellHeight : cellSize.y;

            var columnCount = 0;
            var rowCount = 0;

            for (var i = 0; i < rectChildren.Count; i++)
            {
                rowCount = i / columns;
                columnCount = i % columns;

                var item = rectChildren[i];

                var xPos = cellSize.x * columnCount + spacing.x * columnCount + padding.left;
                var yPos = cellSize.y * rowCount + spacing.y * rowCount + padding.top;

                SetChildAlongAxis(item, 0, xPos, cellSize.x);
                SetChildAlongAxis(item, 1, yPos, cellSize.y);
            }
        }

        public override void CalculateLayoutInputVertical()
        {
        }

        public override void SetLayoutHorizontal()
        {
        }

        public override void SetLayoutVertical()
        {
        }
    }
}